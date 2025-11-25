
import os
import time
import re
from google import genai
from google.genai import types
from dotenv import load_dotenv

# .env 파일에서 환경 변수를 로드합니다.
load_dotenv()

# --- 설정 ---
API_KEY = os.getenv("GEMINI_API_KEY")

# 검색할 파일 검색 스토어의 전체 이름입니다.
FILE_SEARCH_STORE_NAME = ""

# 분석할 새 제품의 기술 문서 파일 경로 목록
INPUT_FILE_PATHS = [
]

# --- 스크립트 본문 ---

def upload_file_with_retry(client, path, max_retries=3):
    """지수 백오프를 사용하여 파일 업로드를 재시도합니다."""
    import tempfile
    import shutil
    
    # 한글 파일명 문제 해결: 임시 영문 파일로 복사
    file_ext = os.path.splitext(path)[1]
    temp_fd, temp_file = tempfile.mkstemp(suffix=file_ext, prefix='upload_')
    os.close(temp_fd)
    
    try:
        shutil.copy2(path, temp_file)
        
        for attempt in range(max_retries):
            try:
                # 임시 파일 업로드 (display_name에 원본 파일명 사용)
                uploaded = client.files.upload(
                    file=temp_file,
                    config={'display_name': os.path.basename(path)}
                )
                return uploaded
            except Exception as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    print(f"파일 업로드 재시도 중... ({attempt + 1}/{max_retries})")
                    continue
                raise e
    finally:
        # 임시 파일 정리
        if os.path.exists(temp_file):
            try:
                os.unlink(temp_file)
            except:
                pass

def get_file_summary(client, file_path: str) -> str:
    """Gemini를 사용하여 파일의 핵심 내용을 요약합니다."""
    print(f"'{os.path.basename(file_path)}' 파일 분석 중...")
    try:
        # 1. 파일 업로드
        uploaded_file = upload_file_with_retry(client, path=file_path)
        
        # 2. 요약 요청
        prompt = "이 문서는 의료기기에 대한 기술문서의 일부입니다. 이 파일의 핵심 내용을 다른 문서와 비교하기 쉽도록 주요 특징, 기능, 사양 위주로 요약해주세요."
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt, uploaded_file]
        )
        
        # 3. 업로드된 임시 파일 삭제
        client.files.delete(name=uploaded_file.name)
        
        print(f"'{os.path.basename(file_path)}' 파일 분석 완료.")
        return response.text
    except Exception as e:
        print(f"'{os.path.basename(file_path)}' 파일 처리 중 오류 발생: {e}")
        return ""

def find_similar_documents():
    """입력된 파일들과 가장 유사한 문서를 파일 검색 스토어에서 찾습니다."""
    if not API_KEY:
        print("오류: API 키가 설정되지 않았습니다. .env 파일에 'GEMINI_API_KEY'를 설정해주세요.")
        return

    if not INPUT_FILE_PATHS:
        print("오류: 분석할 파일이 지정되지 않았습니다. 'INPUT_FILE_PATHS' 목록에 파일 경로를 추가해주세요.")
        return
    
    # 표준 GenAI 인터페이스를 위한 클라이언트/모델 설정

    
    # 요약용 클라이언트 객체는 이 스크립트의 get_file_summary 함수에 필요합니다.
    client = genai.Client(api_key=API_KEY)

    # 1. 각 입력 파일 요약
    print("--- 1단계: 입력 파일 분석 및 요약 ---")
    summaries = [get_file_summary(client, path) for path in INPUT_FILE_PATHS]
    combined_summary = "\n\n".join(s for s in summaries if s)

    if not combined_summary:
        print("모든 파일 분석에 실패하여 검색을 진행할 수 없습니다.")
        return

    print("\n--- 2단계: 종합 요약 기반 검색 실행 ---")
    
    try:
        search_query = combined_summary
        
        print(f"File Search Store [{FILE_SEARCH_STORE_NAME}]에서 유사 문서를 검색합니다...")

        # 공식 문서에 기반한 File Search 설정 (최종)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=search_query,
            config=types.GenerateContentConfig(
                tools=[
                    types.Tool(
                        file_search=types.FileSearch(
                            file_search_store_names=[FILE_SEARCH_STORE_NAME]
                        )
                    )
                ]
            )
        )

        print("\n" + "="*60)
        print("--- 3단계: 검색 결과 ---")
        print("="*60)
        print(response.text)

    except Exception as e:
        print(f"\n검색 중 오류가 발생했습니다: {e}")
        print("\n라이브러리 버전 문제를 확인해주세요. 'pip install --upgrade google-generativeai' 명령어로 라이브러리를 최신 버전으로 업데이트해야 할 수 있습니다.")


if __name__ == "__main__":
    find_similar_documents()
