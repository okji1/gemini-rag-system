"""
도큐메딕 API 서버
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import shutil
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # React에서 접근 가능하도록

# --- 설정 ---
API_KEY = os.getenv("GEMINI_API_KEY")
FILE_SEARCH_STORE_NAME = "           "
client = genai.Client(api_key=API_KEY)

# 품목 항목별 매핑
CATEGORY_MAP = {
    "모양 및 구조(작용원리)": "모양및구조-작용원리",
    "모양 및 구조(외형)": "모양및구조-외형",
    "모양 및 구조(치수)": "모양및구조-치수",
    "모양 및 구조(특성)": "모양및구조-특성",
    "원재료": "원재료",
    "성능": "성능",
    "사용목적": "사용목적",
    "사용방법": "사용방법",
    "사용 시 주의사항": "사용시주의사항"
}

CATEGORY_TITLES = {
    "모양및구조-작용원리": "작용원리",
    "모양및구조-외형": "외형",
    "모양및구조-치수": "치수",
    "모양및구조-특성": "특성",
    "원재료": "원재료",
    "사용목적": "사용목적",
    "성능": "성능",
    "사용방법": "사용방법",
    "사용시주의사항": "사용 시 주의사항"
}


def upload_text_as_file(text_content, category):
    """텍스트를 임시 파일로 저장하고 업로드"""
    temp_fd, temp_file = tempfile.mkstemp(suffix='.txt', prefix='user_input_')
    os.close(temp_fd)
    
    try:
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(text_content)
        
        uploaded = client.files.upload(
            file=temp_file, 
            config={'display_name': f'{category}_사용자입력.txt'}
        )
        return uploaded, temp_file
    except Exception as e:
        if os.path.exists(temp_file):
            os.unlink(temp_file)
        raise e


def classify_and_generate(category, user_content, uploaded_files, grade=None, item_code=None):
    """
    품목 분류 후 초안 생성
    
    Args:
        category: 웹에서 선택한 카테고리 (예: '모양 및 구조(작용원리)')
        user_content: 사용자가 입력한 텍스트
        uploaded_files: 업로드된 Gemini 파일 객체 리스트
        grade: 웹에서 선택한 등급 (1, 2, 3, 4)
        item_code: 웹에서 선택한 품목코드 (예: A07040.03)
    
    Returns:
        생성된 초안 텍스트
    """
    # 카테고리 매핑
    mapped_category = CATEGORY_MAP.get(category, category)
    section_title = CATEGORY_TITLES.get(mapped_category, category)
    
    # 웹에서 선택한 품목 정보 사용
    target_code = item_code if item_code else "A07040.03"
    target_grade = grade if grade else 2
    
    # 품목명은 코드에서 추출 (간단히 카테고리로 표시)
    item_category_map = {
        'A': '기구·기계',
        'B': '재료',
        'C': '치과재료',
        'D': '의료용품'
    }
    item_category = item_category_map.get(target_code[0], '의료기기')
    item_name = f"{target_grade}등급 {item_category} ({target_code})"
    
    # 2단계: File Search 설정 (메타데이터 필터링)
    file_search_config = types.FileSearch(
        file_search_store_names=[FILE_SEARCH_STORE_NAME]
    )
    
    # 메타데이터 필터 적용
    if target_code and mapped_category:
        filter_conditions = [
            f'classification_number="{target_code}"',
            f'document_section:"{mapped_category}"'
        ]
        file_search_config.metadata_filter = ' AND '.join(filter_conditions)
    
    # 3단계: 유사 문서 검색 + 초안 생성 (통합)
    generation_prompt = f"""
당신은 '도큐메딕(Documedix)' AI 솔루션입니다.

**[제품 정보]**
- 등급: {target_grade}등급
- 품목코드: {target_code}
- 분류: {item_category}

**[임무]**
사용자가 제공한 제품 정보를 바탕으로 '의료기기 제조 허가 신청서'의 '{section_title}' 항목을 작성하세요.

**[참조 지침]**
1. File Search를 통해 품목코드 '{target_code}' ({target_grade}등급 {item_category})의 '{mapped_category}' 항목에 해당하는 기존 합격 문서들의 스타일과 용어를 정확히 모방하세요.
2. 특히 **같은 품목코드({target_code})** 또는 **유사한 품목코드(같은 대분류)**의 승인 문서를 우선적으로 참조하세요.
3. 식약처 고시나 가이드라인 문서가 검색되면 해당 작성 지침을 반드시 준수하세요.
4. 기존 합격 사례의 문장 구조, 전문 용어, 표현 방식을 참고하세요.
5. 사용자가 제공한 제품 정보를 최대한 반영하되, 누락된 정보는 합격 사례를 참고하여 보완하세요.

**[사용자 제공 정보]**
{user_content}

**[출력 형식 - 매우 중요]**
1. HTML 형식으로 작성하세요. 제목은 제외하고 본문만 작성하세요.
2. **표가 필요한 경우 반드시 HTML 테이블 형식을 사용하세요:**
   - <table> 태그 사용
   - <thead>, <tbody> 구조 사용
   - <th>로 헤더, <td>로 데이터 셀 작성
   - border, cellpadding, cellspacing 등 스타일 속성 포함
   - 예시:
   <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
     <thead>
       <tr>
         <th>항목</th>
         <th>내용</th>
       </tr>
     </thead>
     <tbody>
       <tr>
         <td>제품명</td>
         <td>예시 제품</td>
       </tr>
     </tbody>
   </table>
3. 마크다운 테이블(| 기호 사용)은 절대 사용하지 마세요.
4. 일반 텍스트 형식의 표도 사용하지 마세요.
5. 구조화된 정보는 항상 HTML 테이블로 표현하세요.
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[generation_prompt] + uploaded_files,
            config=types.GenerateContentConfig(
                tools=[types.Tool(file_search=file_search_config)]
            )
        )
        
        return response.text
    except Exception as e:
        raise Exception(f"초안 생성 실패: {str(e)}")


@app.route('/api/generate-draft', methods=['POST'])
def generate_draft_api():
    """
    POST /api/generate-draft
    
    Request Body:
    {
        "category": "모양 및 구조(작용원리)",
        "textContent": "사용자가 입력한 텍스트...",
        "grade": 2,
        "itemCode": "A07040.03",
        "files": [파일 업로드 - 추후 구현]
    }
    
    Response:
    {
        "success": true,
        "draft": "생성된 초안...",
        "error": null
    }
    """
    try:
        data = request.json
        category = data.get('category')
        text_content = data.get('textContent', '')
        grade = data.get('grade')  # 웹에서 선택한 등급
        item_code = data.get('itemCode')  # 웹에서 선택한 품목코드
        
        if not category:
            return jsonify({
                'success': False,
                'draft': None,
                'error': '카테고리를 선택해주세요.'
            }), 400
        
        if not text_content.strip():
            return jsonify({
                'success': False,
                'draft': None,
                'error': '내용을 입력해주세요.'
            }), 400
        
        if not item_code:
            return jsonify({
                'success': False,
                'draft': None,
                'error': '품목을 선택해주세요.'
            }), 400
        
        # 사용자 텍스트를 임시 파일로 업로드
        uploaded_file, temp_path = upload_text_as_file(text_content, category)
        
        try:
            # 초안 생성 (등급과 품목코드 전달)
            draft = classify_and_generate(category, text_content, [uploaded_file], grade, item_code)
            
            return jsonify({
                'success': True,
                'draft': draft,
                'error': None
            })
        
        finally:
            # 정리
            try:
                client.files.delete(name=uploaded_file.name)
            except:
                pass
            if os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except:
                    pass
    
    except Exception as e:
        return jsonify({
            'success': False,
            'draft': None,
            'error': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """헬스 체크"""
    return jsonify({'status': 'ok'})


@app.route('/api/chat', methods=['POST'])
def chat_api():
    """
    POST /api/chat
    
    Request Body:
    {
        "message": "사용자 질문...",
        "category": "모양 및 구조(작용원리)" (선택사항)
    }
    
    Response:
    {
        "success": true,
        "reply": "AI 답변...",
        "error": null
    }
    """
    try:
        data = request.json
        user_message = data.get('message', '')
        category = data.get('category', '')
        
        if not user_message.strip():
            return jsonify({
                'success': False,
                'reply': None,
                'error': '메시지를 입력해주세요.'
            }), 400
        
        # File Search 설정
        file_search_config = types.FileSearch(
            file_search_store_names=[FILE_SEARCH_STORE_NAME]
        )
        
        # 카테고리가 있으면 메타데이터 필터 적용
        if category and category in CATEGORY_MAP:
            mapped_category = CATEGORY_MAP[category]
            file_search_config.metadata_filter = f'document_section:"{mapped_category}"'
        
        # 채팅 프롬프트
        chat_prompt = f"""
당신은 의료기기 제조 허가 신청서 작성을 돕는 전문 AI 어시스턴트입니다.

**[역할]**
- 의료기기 제조 허가 신청서 작성에 대한 질문에 답변합니다.
- File Search를 통해 관련 규정, 가이드라인, 합격 사례를 참조합니다.
- 명확하고 실용적인 답변을 제공합니다.

**[사용자 질문]**
{user_message}

**[답변 지침]**
1. 간결하고 이해하기 쉽게 답변하세요.
2. 관련 규정이나 사례가 있으면 참조하세요.
3. 필요시 예시를 들어 설명하세요.
4. **표가 필요한 경우 반드시 HTML 테이블 형식을 사용하세요:**
   - <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;"> 형식 사용
   - <thead>, <tbody>, <th>, <td> 태그 사용
   - 마크다운 테이블(| 기호) 절대 사용 금지
   - 일반 텍스트 표 형식 사용 금지
5. 답변은 HTML 형식으로 작성하되, 가독성 좋은 구조를 유지하세요.
"""
        
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[chat_prompt],
                config=types.GenerateContentConfig(
                    tools=[types.Tool(file_search=file_search_config)]
                )
            )
            
            return jsonify({
                'success': True,
                'reply': response.text,
                'error': None
            })
        
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            print(f" 채팅 응답 생성 실패:\n{error_detail}")
            raise Exception(f"채팅 응답 생성 실패: {str(e)}")
    
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"  /api/chat 오류:\n{error_detail}")
        return jsonify({
            'success': False,
            'reply': None,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    if not API_KEY:
        print(" 오류: GEMINI_API_KEY가 설정되지 않았습니다.")
        exit(1)
    
    
    
    app.run(host='0.0.0.0', port=5000, debug=False)
