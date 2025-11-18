# 1. 파일 업로드

import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

KNOWLEDGE_BASE_DIR = "knowledge_base"
PRODUCT_INPUT_DIR = "product_input"


def upload_regulation_files(knowledge_dir=KNOWLEDGE_BASE_DIR):
    """Uploads regulation files from the knowledge_base directory."""
    print("--- 규정 파일 업로드 ---")
    
    # Regulation API 키 설정
    api_key = os.getenv("regulation_api")
    if not api_key:
        print("ERROR: regulation_api key is not configured.")
        print("Please set the regulation_api environment variable in your .env file.")
        return []

    genai.configure(api_key=api_key)
    
    if not os.path.exists(knowledge_dir):
        print(f"Knowledge base directory '{knowledge_dir}' not found.")
        return []

    # Get the list of files already uploaded
    existing_files = {f.display_name: f for f in genai.list_files()}
    print(f"Found {len(existing_files)} files already uploaded to Gemini Files API.")

    # Get the list of files in the local directory
    local_files = [f for f in os.listdir(knowledge_dir) if os.path.isfile(os.path.join(knowledge_dir, f))]
    print(f"Found {len(local_files)} files in the local directory '{knowledge_dir}'.")

    regulation_files = []
    # Upload files that are not already uploaded
    for filename in local_files:
        if filename not in existing_files:
            filepath = os.path.join(knowledge_dir, filename)
            print(f"Uploading '{filename}'...")
            try:
                file = genai.upload_file(path=filepath, display_name=filename)
                print(f"  ✓ Successfully uploaded '{filename}' as {file.name}")
                regulation_files.append(file)
            except Exception as e:
                print(f"  ✗ Error uploading '{filename}': {e}")
        else:
            print(f"'{filename}' already uploaded. Using existing file object.")
            regulation_files.append(existing_files[filename])
    
    print(f"\n총 {len(regulation_files)}개의 규정 파일이 업로드되었습니다.")
    return regulation_files


def upload_product_files(product_dir=PRODUCT_INPUT_DIR):
    """Uploads product files from the product_input directory."""
    print("--- 제품 파일 업로드 ---")
    
    # Product API 키 설정
    api_key = os.getenv("product_api")
    if not api_key:
        print("ERROR: product_api key is not configured.")
        print("Please set the product_api environment variable in your .env file.")
        return []

    genai.configure(api_key=api_key)
    
    if not os.path.exists(product_dir):
        print(f"Product directory '{product_dir}' not found.")
        os.makedirs(product_dir)
        print(f"Created directory '{product_dir}'. Please add files and run again.")
        return []

    product_files_to_upload = [f for f in os.listdir(product_dir) if os.path.isfile(os.path.join(product_dir, f))]
    
    if not product_files_to_upload:
        print(f"No files found in '{product_dir}'. Please add files and try again.")
        return []

    uploaded_product_files = []
    for filename in product_files_to_upload:
        filepath = os.path.join(product_dir, filename)
        print(f"Uploading '{filename}'...")
        try:
            file_obj = genai.upload_file(path=filepath, display_name=filename)
            uploaded_product_files.append(file_obj)
            print(f"  ✓ Successfully uploaded '{filename}' as {file_obj.name}")
        except Exception as e:
            print(f"  ✗ Error uploading '{filename}': {e}")

    print(f"\n총 {len(uploaded_product_files)}개의 제품 파일이 업로드되었습니다.")
    return uploaded_product_files


if __name__ == "__main__":
    print("=== 파일 업로드 도구 ===\n")
    print("1. 규정 파일 업로드 (knowledge_base)")
    print("2. 제품 파일 업로드 (product_input)")
    print("3. 모두 업로드")
    
    choice = input("\n선택하세요 (1-3): ").strip()
    
    if choice == "1":
        upload_regulation_files()
    elif choice == "2":
        upload_product_files()
    elif choice == "3":
        upload_regulation_files()
        print("\n")
        upload_product_files()
    else:
        print("잘못된 선택입니다.")