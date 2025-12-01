import os
import time
import shutil
import tempfile
from dotenv import load_dotenv
from google import genai
from google.genai import types

# .env 로드
load_dotenv()

# --- [설정] ---
# 마스터 데이터(별표1, 고시 등)를 넣어둘 폴더 경로 
MASTER_DATA_DIR = r""

# 기존 스토어와 동일한 이름을 사용해야 하나의 DB에서 검색 가능합니다.
FILE_SEARCH_STORE_DISPLAY_NAME = ""

# --- Gemini Client ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found.")
    exit()
client = genai.Client(api_key=api_key)

def get_store(display_name: str):
    """기존 Store를 찾습니다."""
    print(f"Store '{display_name}' 연결 중...")
    for store in client.file_search_stores.list():
        if store.display_name == display_name:
            print(f"  ✓ Store ID: {store.name}")
            return store
    print(f"  X Store를 찾을 수 없습니다. 먼저 upload_script.py를 실행해 Store를 생성하세요.")
    return None

def get_master_metadata(filename: str) -> list:
    """
    """
    metadata = []
    
    # 1. 품목 분류 리스트 (Codebook)
    if "별표" in filename or "품목" in filename:
        print(f"  🏷️  [메타데이터 분류] 품목 분류 기준 문서로 식별됨")
        metadata.append({"key": "doc_type", "string_value": "classification_master"})
        metadata.append({"key": "importance", "string_value": "high"})
    
    # 2. 법령/고시/가이드라인 (Rules)
    elif "고시" in filename or "규정" in filename or "가이드라인" in filename:
        print(f"  🏷️  [메타데이터 분류] 법적 규제/고시 문서로 식별됨")
        metadata.append({"key": "doc_type", "string_value": "regulation_rule"})
        metadata.append({"key": "importance", "string_value": "high"})
    
    else:
        print(f"  🏷️  [메타데이터 분류] 일반 참고 자료로 식별됨")
        metadata.append({"key": "doc_type", "string_value": "general_reference"})

    return metadata

def upload_master_files(data_dir: str, store):
    if not os.path.exists(data_dir):
        print(f"오류: '{data_dir}' 폴더가 없습니다. 폴더를 생성하고 마스터 PDF를 넣어주세요.")
        return

    print(f"\n--- 마스터 데이터 업로드 시작: {data_dir} ---")
    
    # 이미 업로드된 파일 확인 (중복 방지)
    existing_files = set()
    try:
        for f in client.files.list():
            if f.file_search_stores and store.name in f.file_search_stores:
                existing_files.add(f.display_name)
    except:
        pass

    for root, _, files in os.walk(data_dir):
        for file in files:
            if not file.lower().endswith(('.pdf', '.txt', '.xlsx')):
                continue

            if file in existing_files:
                print(f"  ℹ [Skip] 이미 존재함: {file}")
                continue

            file_path = os.path.join(root, file)
            print(f"\n처리 중: {file}")

            # 1. 메타데이터 생성
            custom_metadata = get_master_metadata(file)

            # 2. 업로드 (한글명 처리)
            temp_file = None
            try:
                file_ext = os.path.splitext(file)[1]
                temp_fd, temp_file = tempfile.mkstemp(suffix=file_ext, prefix='master_')
                os.close(temp_fd)
                shutil.copy2(file_path, temp_file)

                print("  ⬆ 업로드 중...")
                operation = client.file_search_stores.upload_to_file_search_store(
                    file=temp_file,
                    file_search_store_name=store.name,
                    config={
                        'display_name': file,
                        'custom_metadata': custom_metadata
                    }
                )

                # 대기
                while not operation.done:
                    time.sleep(2)
                    operation = client.operations.get(operation)

                print("  ✓ 완료!")

            except Exception as e:
                print(f"  X 실패: {e}")
            finally:
                if temp_file and os.path.exists(temp_file):
                    os.unlink(temp_file)

if __name__ == "__main__":
    store = get_store(FILE_SEARCH_STORE_DISPLAY_NAME)
    if store:
        upload_master_files(MASTER_DATA_DIR, store)
