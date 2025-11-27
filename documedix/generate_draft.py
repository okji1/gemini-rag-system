import os
import time
import json
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

# --- 설정 ---
API_KEY = os.getenv("GEMINI_API_KEY")
FILE_SEARCH_STORE_NAME = ""

# 분석할 새 제품의 기술 문서 파일 경로 목록
INPUT_FILE_PATHS = [
]

client = genai.Client(api_key=API_KEY)

# --- 헬퍼 함수 ---

def upload_temp_file(path):
    """분석용 임시 파일 업로드 (한글 처리 포함)"""
    import tempfile, shutil
    file_ext = os.path.splitext(path)[1]
    temp_fd, temp_file = tempfile.mkstemp(suffix=file_ext, prefix='analyze_')
    os.close(temp_fd)
    shutil.copy2(path, temp_file)
    
    try:
        uploaded = client.files.upload(file=temp_file, config={'display_name': os.path.basename(path)})
        return uploaded, temp_file
    except Exception as e:
        if os.path.exists(temp_file): 
            os.unlink(temp_file)
        raise e

# --- 3단계 워크플로우 ---

def step1_identify_classification(user_files):
    """
    1단계: 사용자의 문서를 분석하여 품목 코드와 등급을 추론합니다.
    File Search Store에서 관련 규정 문서를 참조합니다.
    """
    print("\n🔍 [1단계] 제품 품목 분류 분석 중...")
    
    prompt = """
당신은 의료기기 인허가 전문가입니다. 
제공된 사용자의 제품 설명서를 분석하고, File Search Store에 있는 
의료기기 품목 분류 관련 문서를 참조하여 다음을 결정하세요.

**분석 항목:**
1. 이 제품에 가장 적합한 '품목명'과 '분류번호(예: A07040.03)'는 무엇입니까?
2. 이 제품의 '등급(1~4)'은 무엇입니까?
3. 판단 근거는 무엇입니까?

**중요: 반드시 아래 JSON 형식으로만 출력하세요. 다른 설명이나 텍스트를 추가하지 마세요.**

```json
{
  "classification_code": "A00000.00",
  "grade": 2,
  "item_name": "품목명",
  "reason": "판단 근거 요약"
}
```
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt] + user_files,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                tools=[types.Tool(file_search=types.FileSearch(file_search_store_names=[FILE_SEARCH_STORE_NAME]))]
            )
        )
        
        # JSON 파싱 시도
        response_text = response.text.strip()
        
        # JSON 코드 블록 제거 (```json ... ``` 또는 ```...``` 형식)
        if "```json" in response_text:
            # ```json과 ``` 사이의 내용 추출
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            response_text = response_text[start:end].strip()
        elif response_text.startswith("```"):
            # 일반 코드 블록
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]).strip()
        
        result = json.loads(response_text)
        print(f"   ✅ 분석 결과: {result.get('classification_code')} ({result.get('grade')}등급)")
        print(f"   📋 품목명: {result.get('item_name')}")
        print(f"   💡 근거: {result.get('reason')[:100]}...")
        return result
    except json.JSONDecodeError as e:
        print(f"   ⚠️ JSON 파싱 실패: {e}")
        print(f"   응답 내용: {response.text[:200]}...")
        print("   파일 경로에서 메타데이터를 추출합니다.")
        
        # 대안: 파일 경로에서 메타데이터 추출
        import re
        if INPUT_FILE_PATHS:
            first_path = INPUT_FILE_PATHS[0]
            pattern = r'class(\d+)[/\\](\d+)등급_([A-Z]\d{5}\.\d{2})'
            match = re.search(pattern, first_path)
            if match:
                grade = int(match.group(2))
                classification_code = match.group(3)
                result = {
                    "classification_code": classification_code,
                    "grade": grade,
                    "item_name": "추출된 품목",
                    "reason": "파일 경로에서 자동 추출"
                }
                print(f"   ✅ 경로 추출 결과: {classification_code} ({grade}등급)")
                return result
        
        return {"classification_code": None, "grade": None, "item_name": None, "reason": "추출 실패"}
    except Exception as e:
        print(f"   ⚠️ 분류 실패: {e}")
        return {"classification_code": None, "grade": None, "item_name": None, "reason": "오류 발생"}


def step2_search_similar_documents(user_files, classification_info):
    """
    2단계: 확정된 품목 코드를 필터로 사용하여 
    가장 유사한 기허가 문서를 검색합니다.
    """
    target_code = classification_info.get("classification_code")
    target_grade = classification_info.get("grade")
    
    print(f"\n🔎 [2단계] [{target_code}] 관련 합격 사례 검색 중...")

    # File Search 설정 (현재 SDK는 filter 미지원)
    file_search_config = types.FileSearch(
        file_search_store_names=[FILE_SEARCH_STORE_NAME]
    )
    
    # TODO: 향후 filter API 지원 시 활성화
    # if target_code and target_grade:
    #     print(f"   🔍 필터 적용 예정: 등급={target_grade}, 품목코드={target_code}")

    search_prompt = f"""
제공된 제품 문서를 기반으로, File Search Store에서 유사한 기허가 문서를 찾아주세요.

**중요: 다음 조건에 정확히 일치하는 문서만 검색하세요:**
- 품목코드: {target_code}
- 등급: {target_grade}등급

**찾아야 할 내용:**
1. 품목코드 '{target_code}'에 해당하는 제품의 기술문서 (작용원리, 사용목적, 성능, 사용방법)
2. 해당 품목에 대한 식약처 작성 가이드라인
3. 합격한 사례의 문서 구조와 표현 방식

**주의:** 다른 품목코드나 등급의 문서는 참조하지 마세요.

검색된 문서의 주요 내용을 요약해주세요.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[search_prompt] + user_files,
            config=types.GenerateContentConfig(
                tools=[types.Tool(file_search=file_search_config)]
            )
        )
        
        print(f"   ✅ 유사 문서 검색 완료")
        return response.text
    except Exception as e:
        print(f"   ⚠️ 검색 실패: {e}")
        return ""


def step3_generate_draft(user_files, classification_info, similar_docs):
    """
    3단계: 검색된 합격 사례를 참조하여 
    의료기기 제조 허가 신청서의 기술문서 초안을 작성합니다.
    """
    target_code = classification_info.get("classification_code")
    item_name = classification_info.get("item_name", "의료기기")
    
    print(f"\n✍️ [3단계] 기술문서 초안 생성 중...")

    # File Search 설정
    file_search_config = types.FileSearch(
        file_search_store_names=[FILE_SEARCH_STORE_NAME]
    )
    
    # TODO: filter API 지원 시 활성화

    generation_prompt = f"""
당신은 '도큐메딕(Documedix)' AI 솔루션입니다.

**[임무]**
사용자의 제품 파일을 바탕으로 '의료기기 제조 허가 신청서'의 다음 항목을 작성하세요:
1. **작용원리** (제품이 어떻게 작동하는지)
2. **사용목적** (제품의 의료적 용도)
3. **성능** (주요 기능 및 사양)
4. **사용방법** (사용 절차 및 주의사항)

**[참조 지침]**
1. File Search를 통해 품목코드 '{target_code}' ({item_name})에 해당하는 기존 합격 문서들의 스타일과 용어를 모방하세요.
2. 식약처 고시나 가이드라인 문서가 검색되면 해당 작성 지침을 반드시 준수하세요.
3. 기존 합격 사례의 문장 구조, 전문 용어, 표현 방식을 참고하세요.
4. 사용자가 제공한 제품 정보를 최대한 반영하되, 누락된 정보는 합격 사례를 참고하여 보완하세요.

**[검색된 유사 문서 정보]**
{similar_docs[:1000]}...

**[출력 형식]**
Markdown 형식으로 각 항목을 명확하게 구분하여 작성하세요.

---

# 의료기기 기술문서 초안

## 1. 작용원리
(작성 내용)

## 2. 사용목적
(작성 내용)

## 3. 성능
(작성 내용)

## 4. 사용방법
(작성 내용)

---
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[generation_prompt] + user_files,
            config=types.GenerateContentConfig(
                tools=[types.Tool(file_search=file_search_config)]
            )
        )
        
        print(f"   ✅ 초안 생성 완료")
        return response.text
    except Exception as e:
        print(f"   ⚠️ 생성 실패: {e}")
        return ""


# --- 메인 실행 ---

def main():
    """도큐메딕 문서 생성 파이프라인 실행"""
    print("="*60)
    print("📄 도큐메딕(Documedix) - AI 기반 의료기기 기술문서 생성")
    print("="*60)
    
    if not API_KEY:
        print("❌ 오류: API 키가 설정되지 않았습니다.")
        return
    
    if not INPUT_FILE_PATHS:
        print("❌ 오류: 분석할 파일이 지정되지 않았습니다.")
        return

    # 0. 사용자 파일 업로드
    uploaded_files = []
    temp_paths = []
    
    print("\n📤 파일 업로드 중...")
    for path in INPUT_FILE_PATHS:
        try:
            up_file, temp_path = upload_temp_file(path)
            uploaded_files.append(up_file)
            temp_paths.append(temp_path)
            print(f"   ✅ {os.path.basename(path)}")
        except Exception as e:
            print(f"   ❌ {os.path.basename(path)}: {e}")

    if not uploaded_files:
        print("❌ 업로드된 파일이 없습니다.")
        return

    try:
        # 1단계: 품목 분류 분석
        cls_info = step1_identify_classification(uploaded_files)
        
        # 2단계: 유사 문서 검색
        similar_docs = step2_search_similar_documents(uploaded_files, cls_info)
        
        # 3단계: 초안 생성
        draft = step3_generate_draft(uploaded_files, cls_info, similar_docs)
        
        # 결과 출력
        print("\n" + "="*60)
        print("📄 생성된 기술문서 초안")
        print("="*60)
        print(draft)
        
        # 결과를 파일로 저장
        output_path = os.path.join(os.path.dirname(__file__), "generated_draft.md")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"# 품목 분류 정보\n\n")
            f.write(f"- 품목코드: {cls_info.get('classification_code')}\n")
            f.write(f"- 등급: {cls_info.get('grade')}등급\n")
            f.write(f"- 품목명: {cls_info.get('item_name')}\n")
            f.write(f"- 근거: {cls_info.get('reason')}\n\n")
            f.write("---\n\n")
            f.write(draft)
        
        print(f"\n💾 초안이 저장되었습니다: {output_path}")
        
    except Exception as e:
        print(f"\n❌ 처리 중 오류 발생: {e}")
        
    finally:
        # 정리
        print("\n🧹 임시 파일 정리 중...")
        for f in uploaded_files:
            try:
                client.files.delete(name=f.name)
            except:
                pass
        for p in temp_paths:
            if os.path.exists(p): 
                try:
                    os.unlink(p)
                except:
                    pass
        print("   ✅ 정리 완료")


if __name__ == "__main__":
    main()
