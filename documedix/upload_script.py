import os
import re
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

# .env 파일에서 환경 변수 로드
load_dotenv()

# --- 설정 ---
# 의료기기 문서가 저장된 실제 루트 디렉토리 경로로 수정
DATA_ROOT_DIR = r" "  

# File Search Store의 표시 이름
FILE_SEARCH_STORE_DISPLAY_NAME = "medical-device-certification-store"

# --- Gemini API 클라이언트 초기화 ---
try:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY or GOOGLE_API_KEY not found in .env file.")
        exit()
    client = genai.Client(api_key=api_key)
    print("Gemini API configured successfully.")
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
    print("Please ensure GEMINI_API_KEY or GOOGLE_API_KEY is set correctly in your .env file.")
    exit()

def get_or_create_file_search_store(display_name: str):
    """표시 이름으로 기존 File Search Store를 가져오거나 새로 생성합니다."""
    print(f"File Search Store '{display_name}' 확인 중...")
    for store in client.file_search_stores.list():
        if store.display_name == display_name:
            print(f"  ✓ 기존 Store 발견: {store.name}")
            return store
    
    print(f"  ! Store를 찾을 수 없습니다. 새로 생성합니다...")
    new_store = client.file_search_stores.create(config={'display_name': display_name})
    print(f"  ✓ 새 Store 생성 완료: {new_store.name}")
    return new_store

def parse_metadata_for_store(file_path: str, base_dir: str) -> list:
    """
    파일 경로에서 File Search Store의 custom_metadata 형식에 맞는 메타데이터를 파싱합니다.
    """
    relative_path = os.path.relpath(file_path, base_dir)
    parts = relative_path.split(os.sep)

    if len(parts) < 3:
        return []

    grade_match = re.match(r"class(\d+)", parts[0])
    grade = int(grade_match.group(1)) if grade_match else None

    classification_part = parts[1]
    classification_number_match = re.match(r"\d+등급_([A-Z0-9.]+)", classification_part)
    classification_number = classification_number_match.group(1) if classification_number_match else None

    filename_without_ext = os.path.splitext(parts[2])[0]
    file_name_parts = filename_without_ext.split('_', 2)

    company_name = file_name_parts[0] if len(file_name_parts) > 0 else None
    approval_number = file_name_parts[1] if len(file_name_parts) > 1 else None
    document_section = file_name_parts[2] if len(file_name_parts) > 2 else None

    metadata = []
    if grade is not None:
        metadata.append({"key": "grade", "numeric_value": grade})
    if classification_number:
        metadata.append({"key": "classification_number", "string_value": classification_number})
    if company_name:
        metadata.append({"key": "company_name", "string_value": company_name})
    if approval_number:
        metadata.append({"key": "approval_number", "string_value": approval_number})
    if document_section:
        metadata.append({"key": "document_section", "string_value": document_section})
    
    return metadata

def upload_files_to_store(data_root_dir: str, file_search_store: types.FileSearchStore):
    """
    data_root_dir을 순회하며 메타데이터와 함께 PDF 파일을 File Search Store에 업로드합니다.
    """
    print(f"파일 업로드 시작: {data_root_dir}")
    
    if not os.path.exists(data_root_dir):
        print(f"오류: 디렉토리를 찾을 수 없습니다: {data_root_dir}")
        return

    # File Search Store에 이미 있는 파일 목록 가져오기 (중복 업로드 방지)
    try:
        all_files = list(client.files.list())
        existing_files_in_store = {
            f.display_name for f in all_files 
            if hasattr(f, 'file_search_stores') and f.file_search_stores 
            and file_search_store.name in f.file_search_stores
        }
        print(f"'{file_search_store.display_name}'에 이미 있는 파일: {len(existing_files_in_store)}개\n")
    except Exception as e:
        print(f"  ℹ 기존 파일 목록을 가져올 수 없습니다. 계속 진행합니다. (오류: {e})\n")
        existing_files_in_store = set()

    uploaded_count = 0
    skipped_count = 0
    
    # 지원하는 파일 확장자
    SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.xlsx', '.xls', '.csv']
    
    for root, _, files in os.walk(data_root_dir):
        for file in files:
            file_ext = os.path.splitext(file)[1].lower()
            
            if file_ext in SUPPORTED_EXTENSIONS:
                full_file_path = os.path.join(root, file)
                
                if file in existing_files_in_store:
                    print(f"  ℹ 이미 Store에 존재합니다. 건너뜁니다: {file}")
                    skipped_count += 1
                    continue

                print(f"처리 중: {file}")
                
                metadata = parse_metadata_for_store(full_file_path, data_root_dir)
                if not metadata:
                    print(f"  ⚠ 메타데이터를 추출하지 못했습니다. 건너뜁니다.")
                    skipped_count += 1
                    continue
                
                print(f"  📋 메타데이터: {metadata}")
                
                # 파일 업로드 (한글 파일명 지원)
                import tempfile
                import shutil
                temp_file = None
                try:
                    # 임시 파일 생성 (영문 이름)
                    temp_fd, temp_file = tempfile.mkstemp(suffix=file_ext, prefix='upload_')
                    os.close(temp_fd)
                    shutil.copy2(full_file_path, temp_file)
                    
                    print(f"  ⬆ 업로드 및 임베딩 중...")
                    operation = client.file_search_stores.upload_to_file_search_store(
                        file=temp_file,  # 임시 영문 파일 사용
                        file_search_store_name=file_search_store.name,
                        config={
                            'display_name': file,  # 원본 파일명은 display_name으로
                            'custom_metadata': metadata
                        }
                    )
                    
                    # 작업 완료 대기 (시간이 오래 걸릴 수 있음)
                    while not operation.done:
                        print(f"    - 작업 진행 중... (파일: {file})")
                        time.sleep(10)
                        operation = client.operations.get(operation)
                    
                    if operation.error:
                        print(f"  ✗ 업로드 중 오류 발생: {operation.error}")
                        skipped_count += 1
                    else:
                        print(f"  ✓ 업로드 및 처리 완료!")
                        uploaded_count += 1
                        existing_files_in_store.add(file) # 중복 체크 목록에 추가

                except Exception as e:
                    print(f"  ✗ 업로드 중 심각한 예외 발생: {e}")
                    skipped_count += 1
                finally:
                    # 임시 파일 정리
                    if temp_file and os.path.exists(temp_file):
                        try:
                            os.unlink(temp_file)
                        except:
                            pass
            else:
                skipped_count += 1

    print(f"\n{'='*60}")
    print(f"--- 업로드 요약 ---")
    print(f"{'='*60}")
    print(f"새로 업로드됨: {uploaded_count}개")
    print(f"건너뜀 (이미 존재하거나, 지원되지 않는 형식이거나, 오류 발생): {skipped_count}개")
    print(f"지원 형식: PDF, TXT, Excel (xlsx, xls), CSV")
    print(f"{'='*60}")

if __name__ == "__main__":
    print("="*60)
    print("의료기기 문서 업로드 스크립트 (File Search Store)")
    print("="*60)
    
    # 1. File Search Store 가져오기 또는 생성하기
    store = get_or_create_file_search_store(FILE_SEARCH_STORE_DISPLAY_NAME)
    if not store:
        print("File Search Store를 가져오거나 생성하는 데 실패했습니다. 스크립트를 종료합니다.")
        exit()

    # 2. 메타데이터와 함께 파일 업로드
    upload_files_to_store(DATA_ROOT_DIR, store)

    print("\n" + "="*60)
    print("스크립트 실행 완료!")
    print("="*60)

