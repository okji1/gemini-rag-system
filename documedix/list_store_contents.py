# 업로드 된 데이터셋 확인
import os
from google import genai
from google.genai import types
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

# File Search Store 설정
FILE_SEARCH_STORE_NAME = " "

def list_uploaded_files():
    """
    File Search Store에 업로드된 파일 정보를 조회합니다.
    """
    print("--- File Search Store 파일 목록 확인 ---")

    # API 키 설정 확인
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("오류: API key가 설정되지 않았습니다.")
        print(".env 파일에 GEMINI_API_KEY를 설정해주세요.")
        return

    try:
        client = genai.Client(api_key=api_key)
        
        print("\n" + "="*60)
        print("=== File Search Store 정보 ===")
        print("="*60)
        
        # Store 메타정보 가져오기
        store = client.file_search_stores.get(name=FILE_SEARCH_STORE_NAME)
        print(f"\nStore 이름: {store.name}")
        print(f"Display 이름: {store.display_name}")
        print(f"생성일: {store.create_time}")
        print(f"업데이트일: {store.update_time}")
        print(f"\n📊 파일 통계:")
        print(f"  ✅ 활성 문서: {store.active_documents_count}개")
        print(f"  ⏳ 처리 중: {store.pending_documents_count or 0}개")
        print(f"  ❌ 실패: {store.failed_documents_count or 0}개")
        print(f"  💾 총 크기: {store.size_bytes:,} bytes ({store.size_bytes / (1024*1024):.2f} MB)")
        
        print("\n" + "="*60)
        print("\n💡 참고:")
        print("현재 google.genai SDK는 File Search Store의 개별 파일 목록을")
        print("직접 조회하는 API를 제공하지 않습니다.")
        print("\n파일을 검색하려면 AI 모델에게 질문하세요. 예:")
        print('  - "3등급 의료기기 관련 문서가 뭐가 있어?"')
        print('  - "씨에스테크놀로지 관련 파일을 찾아줘"')
        print('  - "A01010.01 분류 문서를 알려줘"')
        print("\n" + "="*60)

    except Exception as e:
        print(f"\n오류가 발생했습니다: {e}")
        print("API 키와 Store 이름을 확인해주세요.")


if __name__ == "__main__":
    list_uploaded_files()
