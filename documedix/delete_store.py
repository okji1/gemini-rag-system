# File Search Store 삭제
import os
from google import genai
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

# File Search Store 설정
FILE_SEARCH_STORE_NAME = " "

def delete_file_search_store():
    """
    File Search Store와 그 안의 모든 파일을 삭제합니다.
    """
    print("--- File Search Store 삭제 ---")

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
        
        # Store 정보 확인
        store = client.file_search_stores.get(name=FILE_SEARCH_STORE_NAME)
        print(f"\nStore 이름: {store.name}")
        print(f"Display 이름: {store.display_name}")
        print(f"활성 문서: {store.active_documents_count}개")
        print(f"총 크기: {store.size_bytes:,} bytes ({store.size_bytes / (1024*1024):.2f} MB)")
        
        print("\n" + "="*60)
        print("⚠️  경고: 이 작업은 되돌릴 수 없습니다!")
        print("="*60)
        print(f"Store '{store.display_name}'와")
        print(f"그 안의 모든 {store.active_documents_count}개 파일이 영구적으로 삭제됩니다.")
        
        confirm = input("\n정말로 삭제하시겠습니까? (yes/no): ").strip().lower()
        
        if confirm != 'yes':
            print("\n삭제가 취소되었습니다.")
            return
        
        print("\n삭제 중...")
        
        # force=True: Store 안에 파일이 있어도 강제 삭제
        client.file_search_stores.delete(
            name=FILE_SEARCH_STORE_NAME,
            config={'force': True}
        )
        
        print("\n" + "="*60)
        print("✅ File Search Store가 성공적으로 삭제되었습니다!")
        print("="*60)

    except Exception as e:
        print(f"\n오류가 발생했습니다: {e}")
        print("Store 이름과 API 키를 확인해주세요.")


def list_all_stores():
    """
    모든 File Search Store 목록을 조회합니다.
    """
    print("--- 모든 File Search Store 목록 ---")
    
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("오류: API key가 설정되지 않았습니다.")
        return

    try:
        client = genai.Client(api_key=api_key)
        
        stores = list(client.file_search_stores.list())
        
        if not stores:
            print("\nFile Search Store가 없습니다.")
            return
        
        print(f"\n총 {len(stores)}개의 Store가 있습니다:\n")
        
        for i, store in enumerate(stores, 1):
            print(f"{i}. {store.display_name}")
            print(f"   Store ID: {store.name}")
            print(f"   활성 문서: {store.active_documents_count}개")
            print(f"   크기: {store.size_bytes:,} bytes")
            print(f"   생성일: {store.create_time}")
            print()
        
    except Exception as e:
        print(f"\n오류가 발생했습니다: {e}")


if __name__ == "__main__":
    print("="*60)
    print("File Search Store 관리 도구")
    print("="*60)
    print("\n1. Store 목록 조회")
    print("2. Store 삭제")
    print("3. 종료")
    
    choice = input("\n선택하세요 (1-3): ").strip()
    
    if choice == "1":
        list_all_stores()
    elif choice == "2":
        delete_file_search_store()
    elif choice == "3":
        print("종료합니다.")
    else:
        print("잘못된 선택입니다.")
