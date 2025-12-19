import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    File,
    Blocks,
    Info,
    Ellipsis,
    Send,
    ClipboardCopy,
    Check,
    FileType,
    FileCheck,
    SquarePlus,
    GripVertical,
    RotateCcw,
    X,
    Trash2,
    Menu,
    ImageUp,
    Plus,
    FolderUp,
    FileX,
    ChevronRight,
} from "lucide-react";
import htmlDocx from "html-docx-js/dist/html-docx";
import { saveAs } from "file-saver";
import Header from "./components/Header";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import TextEditor from "./components/TextEditor.jsx";

const menuItems = [
    {
        id: 1,
        title: "모양 및 구조(작용원리)",
        fileName: "docuApp_02.docx",
        content: "",
        placeholder: "(예시) 비접촉식 초음파 펄스를 이용하여 조직의 밀도를 측정하고, 내장된 AI 알고리즘이 수집된 데이터를 분석하여 진단 지표를 산출하는 원리.",
    },
    {
        id: 2,
        title: "모양 및 구조(외형)",
        fileName: "docuApp_03.docx",
        content: "",
        placeholder: "(예시) 거치형 직사각형 본체와 분리 가능한 측정 프로브로 구성되며, 전면부에 LCD 대형 디스플레이가 탑재된 형태.",
    },
    {
        id: 3,
        title: "모양 및 구조(치수)",
        fileName: "docuApp_04.docx",
        content: "",
        placeholder: "(예시) 본체 치수: 300×200×150mm; 프로브 무게: 100g 이하; 총 중량: 3kg 미만.",
    },
    {
        id: 4,
        title: "모양 및 구조(특성)",
        fileName: "docuApp_05.docx",
        content: "",
        placeholder: "(예시) 내열성 플라스틱 소재 사용; IPX4 방수 등급 지원; 무선(Wireless) 또는 유선(Ethernet) 데이터 전송 기능.",
    },
    {
        id: 5,
        title: "원재료",
        fileName: "docuApp_06.docx",
        content: "",
        placeholder: "(예시) 기기 외피: ABS 수지; 환자 접촉부: 의료용 폴리우레탄 필름; 내부 회로 기판: 산업용 PCB.",
    },
    {
        id: 6,
        title: "성능",
        fileName: "docuApp_07.docx",
        content: "",
        placeholder: "(예시) 측정 정확도 ±5% 이내; 데이터 처리 시간 1초 미만; 연속 작동 시간 5시간 이상.",
    },
    {
        id: 7,
        title: "사용목적",
        fileName: "docuApp_08.docx",
        content: "",
        placeholder: "(예시) 생체 신호를 측정하여 특정 질환의 예방, 진단, 또는 완화에 필요한 보조 정보를 제공할 목적으로 사용됨.",
    },
    {
        id: 8,
        title: "사용방법",
        fileName: "docuApp_09.docx",
        content: "",
        placeholder: "(예시) 1. 전원 연결 및 기기 활성화. 2. 측정 프로브를 환부 근처에 위치. 3. 터치스크린의 '시작' 버튼을 눌러 측정 시작 및 결과 출력.",
    },
    {
        id: 9,
        title: "사용 시 주의사항",
        fileName: "docuApp_10.docx",
        content: "",
        placeholder: "(예시) 경고: 인화성 물질 근처에서 사용 금지. 보관: 직사광선을 피해 상온에서 보관. 세척: 지정된 소독액만 사용 가능.",
    },
];

const DocuApp = () => {
    const [activeMenu, setActiveMenu] = useState(1);
    const [sections, setSections] = useState([]);
    const [chatInput, setChatInput] = useState(""); // Input state
    const [chatMessages, setChatMessages] = useState([]); // Chat history state
    const [chatLoading, setChatLoading] = useState(false); // 채팅 로딩 상태
    const [draftLoading, setDraftLoading] = useState(false); // 초안 생성 로딩 상태
    const [copiedIndex, setCopiedIndex] = useState(null);
    // OpenAI API 키 (주의: 실제 프로덕션 환경에서는 이렇게 하면 안 됩니다)
    const [apiKey, setApiKey] = useState("");
    const [apiKeyLoaded, setApiKeyLoaded] = useState(false);

    // 문서 저장 관련 State (2025-11-03 추가)
    const [currentDocType, setCurrentDocType] = useState(1);
    const [currentReportType, setCurrentReportType] = useState(1);
    const [currentDocGrade, setCurrentDocGrade] = useState(1);
    const [currentDocumentId, setCurrentDocumentId] = useState(null);
    const [myDocuments, setMyDocuments] = useState([]);
    const [showDocumentList, setShowDocumentList] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [documentListLoading, setDocumentListLoading] = useState(false);
    const [loading, setLoading] = useState(false); // 문서 불러오기 로딩 상태

    // 등급 및 품목 선택 State
    const [selectedGrade, setSelectedGrade] = useState("1");
    const [selectedItem, setSelectedItem] = useState("");
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [medicalDeviceItems, setMedicalDeviceItems] = useState({
        "1등급": [],
        "2등급": [],
        "3등급": [],
        "4등급": []
    });

    // 의료기기 품목 데이터 로드
    useEffect(() => {
        const loadMedicalDevices = async () => {
            try {
                const response = await fetch(`${process.env.PUBLIC_URL}/medical_devices.json`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setMedicalDeviceItems(data);
                console.log('의료기기 품목 데이터 로드 완료:', {
                    '1등급': data['1등급']?.length,
                    '2등급': data['2등급']?.length,
                    '3등급': data['3등급']?.length,
                    '4등급': data['4등급']?.length
                });
            } catch (error) {
                console.error('의료기기 품목 데이터 로드 실패:', error);
                console.error('경로:', `${process.env.PUBLIC_URL}/medical_devices.json`);
            }
        };
        loadMedicalDevices();
    }, []);

    // 선택된 등급에 따른 품목 필터링
    const filteredItems = medicalDeviceItems[`${selectedGrade}등급`]?.filter(item =>
        item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(itemSearchQuery.toLowerCase())
    ) || [];

    const onDragEnd = (result) => {
        const { source, destination, type } = result;

        if (!destination) return;

        // 1. DND 중단 에러를 발생시키는 상태 업데이트 로직을 제거하고,
        //    현재의 'sections' 상태를 직접 사용합니다.
        const currentSections = sections;

        if (type === "SECTION") {
            if (source.index === destination.index) return;

            const newSections = Array.from(currentSections);
            const [moved] = newSections.splice(source.index, 1);
            newSections.splice(destination.index, 0, moved);

            // 2. DND가 완료된 후에만 상태를 업데이트합니다.
            setSections(newSections);
        } else if (type === "ITEM") {
            const sectionId = source.droppableId.replace("droppable-", "");
            // 수정 전: updatedSections.find(...)
            const section = currentSections.find((s) => s.id === sectionId);
            if (!section) return;

            const newItems = Array.from(section.items);
            const [movedItem] = newItems.splice(source.index, 1);
            newItems.splice(destination.index, 0, movedItem);

            // 2. DND가 완료된 후에만 상태를 업데이트합니다.
            setSections((prev) =>
                prev.map((s) =>
                    s.id === sectionId ? { ...s, items: newItems } : s,
                ),
            );
        }
    };

    useEffect(() => {
        const initialSections = [
            {
                id: "section-1",
                title:
                    menuItems.find((item) => item.id === activeMenu)?.title ||
                    "",
                items: [
                    {
                        type: "content",
                        value:
                            menuItems.find((item) => item.id === activeMenu)
                                ?.content || "<p></p>",
                    },
                ],
            },
        ];
        setSections(initialSections);
    }, [activeMenu]);

    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.item-search-container')) {
                setShowItemDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleMenuClick = (id) => {
        setActiveMenu(id);
    };

    const handleSectionChange = useCallback(
        (sectionId, itemType, value, index = null) => {
            setSections((prevSections) =>
                prevSections.map((section) => {
                    if (section.id === sectionId) {
                        if (itemType === "title") {
                            return { ...section, title: value };
                        } else {
                            const newItems = [...section.items];
                            if (index !== null) {
                                newItems[index] = { ...newItems[index], value };
                            }
                            return { ...section, items: newItems };
                        }
                    }
                    return section;
                }),
            );
        },
        [],
    );

    const handleFileChange = useCallback((sectionId, index, file) => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSections((prevSections) =>
                    prevSections.map((section) => {
                        if (section.id === sectionId) {
                            const newItems = [...section.items];
                            newItems[index] = {
                                type: "file",
                                value: {
                                    file,
                                    preview: reader.result,
                                    name: file.name,
                                },
                            };
                            return { ...section, items: newItems };
                        }
                        return section;
                    }),
                );
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const addNewItem = useCallback((sectionId, type) => {
        setSections((prevSections) =>
            prevSections.map((section) => {
                if (section.id === sectionId) {
                    return {
                        ...section,
                        items: [
                            ...section.items,
                            {
                                type,
                                value: type === "content" ? "<p></p>" : null,
                            },
                        ],
                    };
                }
                return section;
            }),
        );
    }, []);

    const removeItem = useCallback((sectionId, index) => {
        setSections((prevSections) =>
            prevSections.map((section) => {
                if (section.id === sectionId) {
                    const newItems = [...section.items];
                    newItems.splice(index, 1);
                    return { ...section, items: newItems };
                }
                return section;
            }),
        );
    }, []);

    const addNewSection = () => {
        const newId = `section-${Date.now()}`; // 고유 id
        setSections((prev) => [
            ...prev,
            {
                id: newId,
                title: "",
                items: [
                    { type: "content", value: "<p></p>" },
                    { type: "files", value: [] },
                ],
            },
        ]);
    };

    const saveDocument = async () => {
        setSaveLoading(true);

        const formData = new FormData();
        formData.append("action", "save_document");

        // 필수 필드 추가
        formData.append("doc_type", currentDocType);
        formData.append("report_type", currentReportType);
        formData.append("doc_grade", currentDocGrade);
        formData.append("page_type", "A4");

        // File 객체를 제외한 sections 생성 (JSON 직렬화 가능)
        const sectionsForSave = sections.map((section) => ({
            ...section,
            items: section.items.map((item) => {
                if (
                    item.type === "file" &&
                    item.value &&
                    item.value.file &&
                    typeof item.value.file === "object" &&
                    item.value.file.constructor &&
                    item.value.file.constructor.name === "File"
                ) {
                    // File 객체는 JSON으로 변환 불가하므로 파일명과 메타데이터만 저장
                    return {
                        type: "file",
                        value: {
                            name: item.value.name || item.value.file.name,
                            bf_no: item.value.bf_no || null,
                            bf_file: item.value.bf_file || null,
                            file_url: item.value.file_url || null,
                        },
                    };
                }
                return item;
            }),
        }));

        // doc_content를 JSON으로 변환
        const docContent = {
            activeMenu: activeMenu,
            menuTitle: menuItems.find((m) => m.id === activeMenu)?.title || "",
            sections: sectionsForSave, // File 객체가 제거된 버전 사용
            chatMessages: chatMessages,
        };
        formData.append("doc_content", JSON.stringify(docContent));

        // 업데이트용 (기존 문서 수정 시)
        if (currentDocumentId) {
            formData.append("wr_id", currentDocumentId);
        }

        // 파일 업로드 처리 (worker:github_copilot_agent 20251105)
        let fileIndex = 0;
        sections.forEach((section) => {
            section.items.forEach((item) => {
                if (
                    item.type === "file" &&
                    item.value &&
                    item.value.file &&
                    typeof item.value.file === "object" &&
                    item.value.file.constructor &&
                    item.value.file.constructor.name === "File"
                ) {
                    formData.append(`files[${fileIndex}]`, item.value.file);
                    fileIndex++;
                }
            });
        });

        console.log("파일 업로드 개수:", fileIndex);

        try {
            const response = await fetch("/api/docu_api.php", {
                method: "POST",
                body: formData,
                credentials: "include", // 세션 쿠키 포함
            });

            const data = await response.json();

            if (data.success) {
                console.log("문서 저장 성공:", data);

                // 서버에서 반환된 파일 정보로 sections 업데이트
                if (data.data.files && data.data.files.length > 0) {
                    let uploadedFileIndex = 0;
                    const updatedSections = sections.map((section) => ({
                        ...section,
                        items: section.items.map((item) => {
                            if (
                                item.type === "file" &&
                                item.value &&
                                item.value.file &&
                                typeof item.value.file === "object" &&
                                item.value.file.constructor &&
                                item.value.file.constructor.name === "File"
                            ) {
                                const fileInfo =
                                    data.data.files[uploadedFileIndex];
                                uploadedFileIndex++;
                                return {
                                    ...item,
                                    value: {
                                        ...item.value,
                                        bf_no: fileInfo.bf_no,
                                        bf_file: fileInfo.bf_file,
                                        file_url: fileInfo.file_url,
                                        // File 객체는 제거 (이미 업로드됨)
                                        file: null,
                                    },
                                };
                            }
                            return item;
                        }),
                    }));
                    setSections(updatedSections);
                    console.log(
                        "파일 정보 업데이트 완료:",
                        data.data.files.length,
                        "개",
                    );
                }

                alert(`문서가 저장되었습니다. (ID: ${data.data.wr_id})`);
                setCurrentDocumentId(data.data.wr_id); // 저장된 문서 ID 저장
            } else {
                console.error("문서 저장 실패:", data.message);
                alert("문서 저장 실패: " + data.message);
            }
        } catch (error) {
            console.error("Error saving document:", error);
            alert("문서 저장 중 오류가 발생했습니다: " + error.message);
        } finally {
            setSaveLoading(false);
        }
    };

    // 문서 불러오기 함수 (2025-11-03 추가)
    const loadDocument = async (wr_id) => {
        if (!wr_id) {
            alert("문서 ID를 지정해주세요.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/docu_api.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    action: "load_document",
                    wr_id: wr_id,
                }),
                credentials: "include",
            });

            const data = await response.json();

            if (data.success) {
                const docContent = JSON.parse(data.data.doc_content);

                // State 복원
                setActiveMenu(docContent.activeMenu || 1);
                setSections(docContent.sections || []);
                setChatMessages(docContent.chatMessages || []);
                setCurrentDocumentId(wr_id);
                setCurrentDocType(data.data.doc_type);
                setCurrentReportType(data.data.report_type);
                setCurrentDocGrade(data.data.doc_grade);

                // 파일 정보 불러오기 (worker:github_copilot_agent 20251105)
                try {
                    const filesResponse = await fetch("/api/docu_api.php", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                        },
                        body: new URLSearchParams({
                            action: "get_files",
                            wr_id: wr_id,
                        }),
                        credentials: "include",
                    });

                    const filesData = await filesResponse.json();

                    console.log(
                        "[DEBUG] get_files API 응답:",
                        JSON.stringify(filesData, null, 2),
                    );

                    if (
                        filesData.success &&
                        filesData.files &&
                        filesData.files.length > 0
                    ) {
                        console.log(
                            "파일 정보 로드:",
                            filesData.files.length,
                            "개",
                        );

                        // sections의 file 타입 items에 file_url 매핑
                        const updatedSections = docContent.sections.map(
                            (section) => ({
                                ...section,
                                items: section.items.map((item) => {
                                    if (
                                        item.type === "file" &&
                                        item.value &&
                                        item.value.bf_no
                                    ) {
                                        // bf_no로 매칭되는 파일 찾기
                                        const fileInfo = filesData.files.find(
                                            (f) => f.bf_no === item.value.bf_no,
                                        );
                                        if (fileInfo) {
                                            return {
                                                ...item,
                                                value: {
                                                    ...item.value,
                                                    file_url: fileInfo.file_url,
                                                    bf_file: fileInfo.bf_file,
                                                    bf_filesize:
                                                        fileInfo.bf_filesize,
                                                    bf_width: fileInfo.bf_width,
                                                    bf_height:
                                                        fileInfo.bf_height,
                                                },
                                            };
                                        }
                                    }
                                    return item;
                                }),
                            }),
                        );

                        setSections(updatedSections);
                        console.log("파일 URL 매핑 완료");
                    }
                } catch (fileError) {
                    console.error("파일 정보 로드 실패:", fileError);
                    // 파일 로드 실패해도 문서는 표시
                }

                console.log("문서 불러오기 성공:", data);
                alert("문서를 불러왔습니다.");
                setShowDocumentList(false); // 문서 목록 닫기
            } else {
                console.error("문서 불러오기 실패:", data.message);
                alert("문서 불러오기 실패: " + data.message);
            }
        } catch (error) {
            console.error("Error loading document:", error);
            alert("문서 불러오기 중 오류가 발생했습니다: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // 문서 목록 조회 함수 (2025-11-03 추가, 2025-11-06 수정: POST 방식으로 변경)
    const listDocuments = async () => {
        setDocumentListLoading(true);

        try {
            const response = await fetch("/api/docu_api.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    action: "list_documents",
                }),
                credentials: "include",
            });

            const data = await response.json();

            if (data.success) {
                setMyDocuments(data.data || []);
                setShowDocumentList(true);
                console.log("문서 목록 조회 성공:", data);
            } else {
                console.error("문서 목록 조회 실패:", data.message);
                alert("문서 목록 조회 실패: " + data.message);
            }
        } catch (error) {
            console.error("Error listing documents:", error);
            alert("문서 목록 조회 중 오류가 발생했습니다: " + error.message);
        } finally {
            setDocumentListLoading(false);
        }
    };

    // 새 문서 시작 함수 (2025-11-03 추가)
    const newDocument = () => {
        if (
            // eslint-disable-next-line no-restricted-globals
            confirm(
                "현재 작업 중인 내용이 사라집니다. 새 문서를 시작하시겠습니까?",
            )
        ) {
            setActiveMenu(1);
            setSections([]);
            setChatMessages([]);
            setCurrentDocumentId(null);
            setCurrentDocType(1);
            setCurrentReportType(1);
            setCurrentDocGrade(1);
            alert("새 문서를 시작합니다.");
        }
    };

    const getPrintHTML = () => {
        let content = "";

        // 메뉴 제목 (대제목)
        const menuTitle =
            menuItems.find((o) => o.id === activeMenu)?.title || "";
        if (menuTitle) {
            content += `<h1>${menuTitle}</h1>`;
        }

        // 섹션 + 아이템 내용
        sections.forEach((sec) => {
            if (sec.title) {
                content += `<h2>${sec.title}</h2>`;
            }

            sec.items.forEach((item) => {
                if (item.type === "content" && item.value) {
                    content += item.value;
                } else if (item.type === "file" && item.value?.preview) {
                    content += `<img src="${item.value.preview}" style="max-width:100%; height:auto;" /><br>`;
                }
            });
        });

        return content;
    };

    const handlePrint = (editorData) => {
        const printWindow = window.open("", "_blank", "width=800,height=600");
        printWindow.document.write(`
    <html>
      <head>
        <title>Print</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          img { max-width: 100%; height: auto; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #000; padding: 4px; }
        </style>
      </head>
      <body>
        ${editorData}  <!-- CKEditor 내용 삽입 -->
      </body>
    </html>
  `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    const handleRefresh = () => {
        if (
            window.confirm(
                "모든 작성 내용이 초기화됩니다. 정말 초기화 하시겠습니까?",
            )
        ) {
            localStorage.removeItem("documentData");
            setSections([
                {
                    id: "section-1",
                    title: "1. 소제목을 입력하세요.",
                    items: [
                        { type: "content", value: "<p>내용을 입력하세요.</p>" },
                        { type: "files", value: [] },
                    ],
                },
            ]);
        } else return;
    };

    const colorToHex = (colorStr) => {
        if (!colorStr) return undefined;

        colorStr = colorStr.trim();

        // CSS 색상 이름 처리
        const colorNames = {
            black: "000000",
            white: "FFFFFF",
            red: "FF0000",
            green: "008000",
            blue: "0000FF",
            yellow: "FFFF00",
            orange: "FFA500",
            purple: "800080",
            pink: "FFC0CB",
            brown: "A52A2A",
            gray: "808080",
            grey: "808080",
        };
        if (colorNames[colorStr.toLowerCase()])
            return colorNames[colorStr.toLowerCase()];

        // Hex 처리
        if (colorStr.startsWith("#"))
            return colorStr.replace("#", "").substring(0, 6);

        // RGB 처리
        const rgbMatch = colorStr.match(
            /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/,
        );
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
            const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
            const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");
            return `${r}${g}${b}`;
        }

        // HSL 처리
        const hslMatch = colorStr.match(
            /hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/,
        );
        if (hslMatch) {
            let h = parseInt(hslMatch[1]) / 360;
            let s = parseInt(hslMatch[2]) / 100;
            let l = parseInt(hslMatch[3]) / 100;

            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
                .toString(16)
                .padStart(2, "0");
            const g = Math.round(hue2rgb(p, q, h) * 255)
                .toString(16)
                .padStart(2, "0");
            const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
                .toString(16)
                .padStart(2, "0");
            return `${r}${g}${b}`;
        }

        return undefined;
    };

    const saveAsWord = async () => {
        // 이미지 리사이즈 함수
        const resizeImage = (file, maxHeight) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const ratio = maxHeight / img.height;
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width * ratio;
                    canvas.height = maxHeight;
                    const ctx = canvas.getContext("2d");
                    if (ctx)
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL("image/png"));
                };
                img.onerror = reject;

                const reader = new FileReader();
                reader.onload = (e) => {
                    img.src = e.target?.result;
                };
                reader.readAsDataURL(file);
            });
        };

        let content = `
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        <h1>${menuItems.find((o) => o.id === activeMenu)?.title || ""}</h1>
  `;

        for (const section of sections) {
            content += `<h2 style="color:black;">${section.title}</h2>`;

            for (const item of section.items) {
                if (item.type === "content") {
                    const docHTML = item.value;
                    const htmlWithStyles = docHTML
                        .replace(
                            /<table/g,
                            '<table style="border-collapse: collapse; width: 100%; border: 1px solid black;"',
                        )
                        .replace(
                            /<td/g,
                            '<td style="border: 1px solid black; padding: 4px;"',
                        )
                        .replace(
                            /<th/g,
                            '<th style="border: 1px solid black; padding: 4px;"',
                        )
                        .replace(
                            /<img/g,
                            '<img style="max-width:100%; height:auto;"',
                        )
                        .replace(
                            /<span style="color:\s*([^;]+);?"/gi,
                            (_, colorStr) => {
                                const hex = colorToHex(colorStr);
                                return `<span style="color:#${hex}"`;
                            },
                        );

                    content += htmlWithStyles;
                } else if (
                    item.type === "file" &&
                    item.value &&
                    item.value.file
                ) {
                    try {
                        const resizedDataUrl = await resizeImage(
                            item.value.file,
                            300,
                        ); // 높이 300px
                        content += `<img src="${resizedDataUrl}" alt="${item.value.name}" /><br>`;
                    } catch (err) {
                        console.error("이미지 처리 실패:", err);
                    }
                }
            }
        }
        content += `
      </body>
    </html>
  `;

        const blob = htmlDocx.asBlob(content);
        const fileName =
            menuItems.find((item) => item.id === activeMenu)?.fileName ||
            "document.docx";
        saveAs(blob, fileName);
    };

    useEffect(() => {
        const fetchApiKey = async () => {
            try {
                const response = await fetch(
                    "http://\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\",
                );
                if (!response.ok) {
                    throw new Error("API 키를 가져오는데 실패했습니다");
                }
                const data = await response.json();
                if (!data.apiKey) {
                    throw new Error("API 키가 응답에 포함되지 않았습니다");
                }
                setApiKey(data.apiKey);
                setApiKeyLoaded(true);
            } catch (error) {
                console.error("API 키 가져오기 오류:", error);
                setApiKeyLoaded(true); // 오류 발생해도 로딩 완료로 처리
            }
        };
        fetchApiKey();
    }, []);

    useEffect(() => {
        console.log("API Key:", apiKey);
        console.log("API Key Loaded:", apiKeyLoaded);
    }, [apiKey, apiKeyLoaded]);

    const sendMessage = async () => {
        if (!chatInput.trim()) {
            return;
        }

        const newMessage = { sender: "User", text: chatInput };
        setChatMessages((prev) => [...prev, newMessage]);
        setChatInput("");
        setChatLoading(true);

        try {
            const response = await fetch(
                "http://------------:5000/api/chat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: chatInput,
                        category: menuItems.find((o) => o.id === activeMenu)?.title,
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                setChatMessages((prev) => [
                    ...prev,
                    { sender: "AI", text: data.reply },
                ]);
            } else {
                setChatMessages((prev) => [
                    ...prev,
                    { sender: "AI", text: data.error || "오류가 발생했습니다." },
                ]);
            }
        } catch (error) {
            console.error("Error:", error);
            setChatMessages((prev) => [
                ...prev,
                { sender: "AI", text: "채팅 서버 연결에 실패했습니다. API 서버가 실행 중인지 확인해주세요." },
            ]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleCopyMessage = async (text, index) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index); // 클릭한 메시지 인덱스 기록

            // 1.5초 뒤에 다시 원래 아이콘으로
            setTimeout(() => {
                setCopiedIndex(null);
            }, 1500);
        } catch (err) {
            console.error("복사 실패:", err);
        }
    };

    const handleGenerateDraft = async () => {
        // 현재 선택된 메뉴의 모든 내용 수집
        const currentCategory = menuItems.find((o) => o.id === activeMenu)?.title;
        
        // 등급과 품목 검증
        if (!selectedItem) {
            alert('품목을 선택해주세요.');
            return;
        }
        
        // sections에서 모든 content 타입의 값을 수집
        const allContent = sections
            .map((section) => {
                const contentItems = section.items
                    .filter((item) => item.type === 'content' && item.value.trim())
                    .map((item) => item.value)
                    .join('\n\n');
                return contentItems;
            })
            .filter((content) => content.trim())
            .join('\n\n');

        if (!allContent.trim()) {
            alert('먼저 내용을 입력해주세요.');
            return;
        }

        setDraftLoading(true);

        try {
            const response = await fetch('http://----------------/api/generate-draft', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    category: currentCategory,
                    textContent: allContent,
                    grade: parseInt(selectedGrade),
                    itemCode: selectedItem,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // 생성된 초안을 새 섹션으로 추가
                const newId = `section-draft-${Date.now()}`;
                setSections((prev) => [
                    ...prev,
                    {
                        id: newId,
                        title: 'AI 생성 초안',
                        items: [{ type: 'content', value: data.draft }],
                    },
                ]);
                alert('AI 초안이 생성되었습니다!');
            } else {
                alert(data.error || '초안 생성에 실패했습니다.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(
                '초안 생성 중 오류가 발생했습니다. API 서버가 실행 중인지 확인해주세요.'
            );
        } finally {
            setDraftLoading(false);
        }
    };

    return (
        <div className="flex flex-col w-screen h-screen bg-gray-100">
            <style>
                {`
          @media print {
            textarea {
              border: none;
              box-shadow: none;
              resize: none;
            }
            input[type="text"] {
              border: none;
              box-shadow: none;
            }
            .no-print {
              display: none;
            }
          }
        `}
            </style>
            {/* Header */}
            <div className="w-full no-print">
                <Header />
            </div>
            {/* body */}
            <div className="grow w-full flex flex-row bg-gray-100">
                {/* sidenav */}
                <div className="w-1/6 min-w-[200px] bg-white shadow-sm flex flex-col no-print p-4">
                    <div className="flex flex-row items-center gap-2">
                        <File className="text-gray-500" />
                        <span
                            title="문서정보"
                            className="font-bold text-base text-gray-700 whitespace-nowrap text-ellipsis overflow-hidden"
                        >
                            문서정보
                        </span>
                    </div>
                    
                    {/* 등급 선택 */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            등급 선택
                        </label>
                        <select
                            value={selectedGrade}
                            onChange={(e) => {
                                setSelectedGrade(e.target.value);
                                setSelectedItem("");
                                setItemSearchQuery("");
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#9BC250]"
                        >
                            <option value="1">1등급</option>
                            <option value="2">2등급</option>
                            <option value="3">3등급</option>
                            <option value="4">4등급</option>
                        </select>
                    </div>

                    {/* 품목 검색 및 선택 */}
                    <div className="mt-3 relative item-search-container">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            품목 검색
                            <span className="ml-2 text-xs text-gray-500">
                                ({medicalDeviceItems[`${selectedGrade}등급`]?.length || 0}개 품목)
                            </span>
                        </label>
                        <input
                            type="text"
                            value={itemSearchQuery}
                            onChange={(e) => {
                                setItemSearchQuery(e.target.value);
                                setShowItemDropdown(true);
                            }}
                            onFocus={() => setShowItemDropdown(true)}
                            placeholder="품목명 또는 코드 검색 (예: 심전도계, A07040)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#9BC250]"
                        />
                        
                        {/* 드롭다운 목록 */}
                        {showItemDropdown && filteredItems.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                <div className="sticky top-0 bg-gray-50 px-3 py-1 text-xs text-gray-600 border-b">
                                    {filteredItems.length}개 검색 결과
                                </div>
                                {filteredItems.slice(0, 50).map((item) => (
                                    <button
                                        key={item.code}
                                        type="button"
                                        onClick={() => {
                                            setSelectedItem(item.code);
                                            setItemSearchQuery(`${item.code} - ${item.name}`);
                                            setShowItemDropdown(false);
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
                                    >
                                        <div className="font-medium text-gray-900">{item.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span>{item.code}</span>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-gray-400">
                                                {item.category === 'A' && '기구·기계'}
                                                {item.category === 'B' && '재료'}
                                                {item.category === 'C' && '치과재료'}
                                                {item.category === 'D' && '의료용품'}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                                {filteredItems.length > 50 && (
                                    <div className="px-3 py-2 text-xs text-gray-500 text-center bg-gray-50">
                                        {filteredItems.length - 50}개 더 있음 (검색어를 더 입력하세요)
                                    </div>
                                )}
                            </div>
                        )}
                        {showItemDropdown && itemSearchQuery && filteredItems.length === 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-sm text-gray-500 text-center">
                                검색 결과가 없습니다
                            </div>
                        )}
                    </div>

                    {/* 선택된 정보 표시 */}
                    {selectedItem && (
                        <div className="mt-3 p-2 bg-green-50 rounded-md border border-green-200">
                            <div className="text-xs text-gray-600">선택됨</div>
                            <div className="text-sm font-medium text-[#3C8603]">
                                {selectedGrade}등급
                            </div>
                            <div className="text-xs text-gray-700 mt-1">
                                {itemSearchQuery}
                            </div>
                        </div>
                    )}

                    <div className="w-full h-[1px] bg-gray-300 my-4"></div>
                    <div className="flex flex-row items-center gap-2 rounded-md bg-[#9BC250] py-3 px-4">
                        <Blocks className="text-white" />
                        <span className="text-white font-bold text-lg">
                            문서 작성
                        </span>
                    </div>
                    <ul className="mt-4 flex flex-col gap-1">
                        {menuItems.map((item) => (
                            <li key={item.id} className="text-sm">
                                <button
                                    className={`text-left w-full py-1 px-2 rounded-md ${
                                        activeMenu === item.id
                                            ? "bg-green-50 text-[#3C8603]"
                                            : "hover:bg-gray-100"
                                    }`}
                                    onClick={() => handleMenuClick(item.id)}
                                >
                                    {item.title}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-auto border w-full border-solid border-gray-300 rounded-md p-3 flex flex-col">
                        <div className="flex flex-row gap-2 items-center">
                            <Info />
                            <span>안내서 작성 TIP</span>
                        </div>
                        <div className="text-sm mt-2 p-2">
                            구비서류
                            <br />
                            - (체외진단)의료기기
                            <br />
                            - 제조(수입) 신고서
                            <br />
                            <br />
                            제조공정을 위탁한 경우,
                            <br />- 위탁계약서 사본(제조신고에 한함)
                        </div>
                    </div>
                </div>
                {/* main */}
                <div className="w-4/6 flex flex-col h-[calc(100vh-61px)]">
                    <div className="w-full flex flex-row px-6 py-3 border-b border-solid border-gray-300 bg-white items-center no-print">
                        <span className="font-bold text-xl">
                            {menuItems.find((o) => o.id === activeMenu).title ??
                                ""}
                            {currentDocumentId && (
                                <span className="text-sm text-gray-500 ml-2">
                                    (ID: {currentDocumentId})
                                </span>
                            )}
                        </span>
                        <div className="flex flex-row gap-2 text-sm ml-auto">
                            <button
                                type="button"
                                onClick={newDocument}
                                className="flex flex-row items-center gap-1 bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700"
                            >
                                <File size={20} />
                                <span>새문서</span>
                            </button>
                            <button
                                type="button"
                                onClick={listDocuments}
                                className="flex flex-row items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                            >
                                <Blocks size={20} />
                                <span>내문서</span>
                            </button>
                            <button
                                type="button"
                                onClick={saveDocument}
                                disabled={saveLoading}
                                className="flex flex-row items-center gap-1 bg-black text-white px-3 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                            >
                                <FolderUp size={20} />
                                <span>
                                    {saveLoading
                                        ? "저장중..."
                                        : currentDocumentId
                                          ? "문서수정"
                                          : "문서저장"}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={saveAsWord}
                                className="flex flex-row items-center gap-1 bg-[#9BC250] px-3 py-2 rounded-lg hover:bg-[#8ab140]"
                            >
                                <FileType size={20} />
                                <span>Docx로 저장</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePrint(getPrintHTML())}
                                className="flex flex-row items-center gap-1 bg-[#F88F0E] px-3 py-2 rounded-lg hover:bg-[#e07f0d]"
                            >
                                <FileCheck size={20} />
                                <span>PDF로 저장</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-row px-6 py-3 justify-between no-print">
                        <div className="flex flex-row gap-2">
                            <button
                                type="button"
                                onClick={addNewSection}
                                className="flex flex-row gap-1 items-center bg-gray-300 px-3 py-2 rounded-lg"
                            >
                                <SquarePlus size={20} />
                                <span className="text-sm">새 항목 추가</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleGenerateDraft}
                                className="flex flex-row gap-1 items-center bg-[#9BC250] text-white px-3 py-2 rounded-lg disabled:opacity-70"
                                disabled={draftLoading}
                            >
                                {draftLoading ? (
                                    <>
                                        <div className="animate-spin">
                                            <Send size={20} />
                                        </div>
                                        <span className="text-sm">AI 초안 생성 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        <span className="text-sm">AI 초안 생성</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleRefresh}
                            className="flex flex-row gap-1 items-center bg-gray-300 px-3 py-2 rounded-lg"
                        >
                            <RotateCcw size={20} />
                            <span className="text-sm">새로고침</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {draftLoading && (
                            <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-[#9BC250] rounded-lg shadow-md animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-[#9BC250] rounded-full flex items-center justify-center animate-bounce">
                                            <Send className="text-white" size={16} />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-[#3C8603] text-lg mb-1">🚀 AI 초안 생성 중...</h3>
                                        <p className="text-sm text-gray-700">
                                            <span className="font-semibold text-[#9BC250]">15만 건</span>의 의료기기 허가 데이터를 분석하여 최적의 초안을 작성하고 있습니다
                                        </p>
                                        <div className="mt-2 flex gap-1">
                                            <span className="inline-block w-2 h-2 bg-[#9BC250] rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                            <span className="inline-block w-2 h-2 bg-[#9BC250] rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                            <span className="inline-block w-2 h-2 bg-[#9BC250] rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="sections" type="SECTION">
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="bg-gray-100 rounded-lg p-2"
                                    >
                                        {sections.map(
                                            (section, sectionIndex) => (
                                                <Draggable
                                                    key={section.id}
                                                    draggableId={section.id}
                                                    index={sectionIndex}
                                                >
                                                    {(
                                                        providedSection,
                                                        snapshotSection,
                                                    ) => (
                                                        <div className="flex flex-col gap-2">
                                                            <div
                                                                ref={
                                                                    providedSection.innerRef
                                                                }
                                                                {...providedSection.draggableProps}
                                                                className={`flex flex-col gap-2 py-4 px-4 mb-2 bg-white rounded-lg shadow-md ${
                                                                    snapshotSection.isDragging
                                                                        ? "bg-blue-50 shadow-lg"
                                                                        : ""
                                                                }`}
                                                            >
                                                                {/* Section 헤더 */}
                                                                <div className="flex flex-row items-start gap-3">
                                                                    <div
                                                                        {...providedSection.dragHandleProps}
                                                                        className="cursor-grab active:cursor-grabbing no-print"
                                                                    >
                                                                        <GripVertical
                                                                            size={
                                                                                20
                                                                            }
                                                                            className="text-gray-500"
                                                                        />
                                                                    </div>
                                                                    <div className="grow flex flex-col gap-1">
                                                                        <input
                                                                            className="w-[calc(100%-24px)]"
                                                                            type="text"
                                                                            value={
                                                                                section.title
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                setSections(
                                                                                    (
                                                                                        prev,
                                                                                    ) =>
                                                                                        prev.map(
                                                                                            (
                                                                                                s,
                                                                                            ) =>
                                                                                                s.id ===
                                                                                                section.id
                                                                                                    ? {
                                                                                                          ...s,
                                                                                                          title: e
                                                                                                              .target
                                                                                                              .value,
                                                                                                      }
                                                                                                    : s,
                                                                                        ),
                                                                                )
                                                                            }
                                                                        />

                                                                        {/* Section 아이템 */}
                                                                        <Droppable
                                                                            droppableId={`droppable-${section.id}`}
                                                                            type="ITEM"
                                                                        >
                                                                            {(
                                                                                providedItems,
                                                                            ) => (
                                                                                <div
                                                                                    ref={
                                                                                        providedItems.innerRef
                                                                                    }
                                                                                    {...providedItems.droppableProps}
                                                                                    className="flex flex-col gap-2"
                                                                                >
                                                                                    {section.items.map(
                                                                                        (
                                                                                            item,
                                                                                            itemIndex,
                                                                                        ) => (
                                                                                            <Draggable
                                                                                                key={`${section.id}-${item.type}-${itemIndex}`}
                                                                                                draggableId={`${section.id}-${item.type}-${itemIndex}`}
                                                                                                index={
                                                                                                    itemIndex
                                                                                                }
                                                                                            >
                                                                                                {(
                                                                                                    providedItem,
                                                                                                    snapshotItem,
                                                                                                ) => (
                                                                                                    <div
                                                                                                        ref={
                                                                                                            providedItem.innerRef
                                                                                                        }
                                                                                                        {...providedItem.draggableProps}
                                                                                                        {...providedItem.dragHandleProps}
                                                                                                        className="relative"
                                                                                                    >
                                                                                                        {/* item 내용 그대로 */}
                                                                                                        {item.type ===
                                                                                                            "content" && (
                                                                                                            <div className="flex flex-row gap-2">
                                                                                                                <div
                                                                                                                    className="grow h-fit"
                                                                                                                    onMouseDown={(
                                                                                                                        e,
                                                                                                                    ) => {
                                                                                                                        e.stopPropagation();
                                                                                                                    }}
                                                                                                                >
                                                                                                                    <TextEditor
                                                                                                                        key={`editor-${activeMenu}-${section.id}-${itemIndex}`}
                                                                                                                        itemId={
                                                                                                                            item.id
                                                                                                                        }
                                                                                                                        value={
                                                                                                                            item.value
                                                                                                                        }
                                                                                                                        setValue={(
                                                                                                                            newValue,
                                                                                                                        ) =>
                                                                                                                            handleSectionChange(
                                                                                                                                section.id,
                                                                                                                                item.type,
                                                                                                                                newValue,
                                                                                                                                itemIndex,
                                                                                                                            )
                                                                                                                        }
                                                                                                                        placeholder={
                                                                                                                            menuItems.find(m => m.id === activeMenu)?.placeholder || ""
                                                                                                                        }
                                                                                                                    />
                                                                                                                </div>

                                                                                                                <div className="flex flex-col no-print">
                                                                                                                    <button
                                                                                                                        type="button"
                                                                                                                        {...providedItem.dragHandleProps}
                                                                                                                        className="cursor-grab active:cursor-grabbing"
                                                                                                                    >
                                                                                                                        <Menu
                                                                                                                            className="text-gray-400"
                                                                                                                            size={
                                                                                                                                16
                                                                                                                            }
                                                                                                                        />
                                                                                                                    </button>
                                                                                                                    <button
                                                                                                                        type="button"
                                                                                                                        onClick={() =>
                                                                                                                            removeItem(
                                                                                                                                section.id,
                                                                                                                                itemIndex,
                                                                                                                            )
                                                                                                                        }
                                                                                                                        className="mt-auto"
                                                                                                                    >
                                                                                                                        <Trash2
                                                                                                                            className="text-red-400"
                                                                                                                            size={
                                                                                                                                16
                                                                                                                            }
                                                                                                                        />
                                                                                                                    </button>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        )}

                                                                        {item.type ===
                                                                            "file" && (
                                                                            <div className="mt-2 flex flex-row gap-2">
                                                                                <div className="flex w-full flex-col items-center">
                                                                                    {/* 미리보기를 위로 이동 + file_url fallback 추가 */}
                                                                                    {(item
                                                                                        .value
                                                                                        ?.preview ||
                                                                                        item
                                                                                            .value
                                                                                            ?.file_url) ? (
                                                                                        <div className="w-full h-80 border border-solid p-2 mb-2 bg-gray-50 flex items-center justify-center">
                                                                                            <img
                                                                                                src={
                                                                                                    item
                                                                                                        .value
                                                                                                        .preview ||
                                                                                                    item
                                                                                                        .value
                                                                                                        .file_url
                                                                                                }
                                                                                                alt="미리보기"
                                                                                                className="mx-auto h-full object-contain"
                                                                                                onLoad={() => {
                                                                                                    console.log(
                                                                                                        "[✅ 이미지 로드 성공]",
                                                                                                        {
                                                                                                            src:
                                                                                                                item
                                                                                                                    .value
                                                                                                                    .preview ||
                                                                                                                item
                                                                                                                    .value
                                                                                                                    .file_url,
                                                                                                            name: item
                                                                                                                .value
                                                                                                                ?.name,
                                                                                                        },
                                                                                                    );
                                                                                                }}
                                                                                                onError={(e) => {
                                                                                                    console.error(
                                                                                                        "[❌ 이미지 로드 실패]",
                                                                                                        {
                                                                                                            src: e
                                                                                                                .target
                                                                                                                .src,
                                                                                                            name: item
                                                                                                                .value
                                                                                                                ?.name,
                                                                                                        },
                                                                                                    );
                                                                                                    e.target.style.display =
                                                                                                        "none";
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="w-full h-80 border border-dashed border-gray-300 p-2 mb-2 bg-gray-50 flex items-center justify-center rounded">
                                                                                            <div className="text-center text-gray-400">
                                                                                                <ImageUp
                                                                                                    className="mx-auto mb-2 opacity-50"
                                                                                                    size={
                                                                                                        32
                                                                                                    }
                                                                                                />
                                                                                                <p className="text-sm">
                                                                                                    이미지를
                                                                                                    추가해주세요
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}                                                                                                                    {/* 파일 첨부 영역 */}
                                                                                                                    <div className="flex w-full">
                                                                                                                        <label className="flex items-center w-full justify-center py-2 border border-dashed rounded cursor-pointer no-print hover:bg-gray-50">
                                                                                                                            <input
                                                                                                                                type="file"
                                                                                                                                className="hidden"
                                                                                                                                accept="image/*"
                                                                                                                                onChange={(
                                                                                                                                    e,
                                                                                                                                ) =>
                                                                                                                                    handleFileChange(
                                                                                                                                        section.id,
                                                                                                                                        itemIndex,
                                                                                                                                        e
                                                                                                                                            .target
                                                                                                                                            .files[0],
                                                                                                                                    )
                                                                                                                                }
                                                                                                                            />
                                                                                                                            <FolderUp className="mr-2" />
                                                                                                                            {item
                                                                                                                                .value
                                                                                                                                ?.name ||
                                                                                                                                "파일첨부"}
                                                                                                                        </label>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                <div className="flex flex-col no-print">
                                                                                                                    <Menu
                                                                                                                        className="text-gray-400"
                                                                                                                        size={
                                                                                                                            16
                                                                                                                        }
                                                                                                                    />
                                                                                                                    <button
                                                                                                                        type="button"
                                                                                                                        onClick={() =>
                                                                                                                            removeItem(
                                                                                                                                section.id,
                                                                                                                                itemIndex,
                                                                                                                            )
                                                                                                                        }
                                                                                                                        className="mt-auto"
                                                                                                                    >
                                                                                                                        <Trash2
                                                                                                                            className="text-red-400"
                                                                                                                            size={
                                                                                                                                16
                                                                                                                            }
                                                                                                                        />
                                                                                                                    </button>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </div>
                                                                                                )}
                                                                                            </Draggable>
                                                                                        ),
                                                                                    )}
                                                                                    {
                                                                                        providedItems.placeholder
                                                                                    }
                                                                                </div>
                                                                            )}
                                                                        </Droppable>
                                                                    </div>
                                                                    <X
                                                                        size={
                                                                            20
                                                                        }
                                                                        className="text-gray-500 cursor-pointer no-print"
                                                                        onClick={() =>
                                                                            setSections(
                                                                                (
                                                                                    prev,
                                                                                ) =>
                                                                                    prev.filter(
                                                                                        (
                                                                                            s,
                                                                                        ) =>
                                                                                            s.id !==
                                                                                            section.id,
                                                                                    ),
                                                                            )
                                                                        }
                                                                    />
                                                                </div>

                                                                {/* Section 버튼 */}
                                                                <div className="flex flex-row gap-2 ml-auto no-print">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            addNewItem(
                                                                                section.id,
                                                                                "content",
                                                                            )
                                                                        }
                                                                        className="flex flex-row items-center gap-1 px-3 py-2 rounded-md bg-gray-300"
                                                                    >
                                                                        <Plus
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                        <span className="text-sm">
                                                                            내용
                                                                            추가
                                                                        </span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            addNewItem(
                                                                                section.id,
                                                                                "file",
                                                                            )
                                                                        }
                                                                        className="flex flex-row items-center gap-1 px-3 py-2 rounded-md bg-gray-300"
                                                                    >
                                                                        <ImageUp
                                                                            size={
                                                                                16
                                                                            }
                                                                        />
                                                                        <span className="text-sm">
                                                                            파일
                                                                            추가
                                                                        </span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ),
                                        )}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>
                </div>
                {/* ai chat */}
                <div className="w-1/6 min-w-[200px] h-[calc(100vh-61px)] bg-white no-print shadow-sm flex flex-col p-4">
                    <h1 className="font-bold text-lg">AI 채팅</h1>
                    <div className="grow overflow-y-auto max-h-full mt-3 flex flex-col gap-3">
                        {chatMessages.map((message, index) => (
                            <div className="flex flex-row items-end">
                                <div
                                    key={index}
                                    className={`p-2.5 rounded-3xl grow ${
                                        message.sender === "AI"
                                            ? "bg-[#9BC250] rounded-bl-none"
                                            : "bg-gray-100 rounded-br-none"
                                    }`}
                                >
                                    <p className="font-semibold">
                                        {message.sender}
                                    </p>
                                    <p>{message.text}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleCopyMessage(message.text, index)
                                    }
                                    className={`bg-green-50 rounded-xl ml-1 p-2 ${
                                        message.sender === "AI" ? "" : "hidden"
                                    }`}
                                >
                                    {copiedIndex === index ? (
                                        <Check
                                            className="text-green-500"
                                            size={20}
                                        />
                                    ) : (
                                        <ClipboardCopy
                                            className="text-gray-500"
                                            size={20}
                                        />
                                    )}
                                </button>
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="p-2.5 rounded-3xl bg-[#9BC250] rounded-bl-none max-w-[80%]">
                                <p className="font-semibold">AI</p>
                                <div className="flex gap-1 py-2">
                                    <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                    <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                    <span className="inline-block w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                </div>
                            </div>
                        )}
                    </div>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            sendMessage();
                        }}
                        className="flex flex-row gap-2 mt-2"
                    >
                        <input
                            type="text"
                            className="w-full rounded-lg"
                            placeholder="질문을 입력하세요"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-[#9BC250] text-white p-2 w-fit rounded-lg"
                            disabled={chatLoading || !chatInput.trim()}
                        >
                            {chatLoading ? <Ellipsis /> : <Send />}
                        </button>
                    </form>
                </div>
            </div>

            {/* 문서 목록 모달 */}
            {showDocumentList && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                        {/* 모달 헤더 */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-xl font-bold">내 문서 목록</h2>
                            <button
                                onClick={() => setShowDocumentList(false)}
                                className="text-gray-500 hover:text-gray-700 p-1 rounded"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* 문서 목록 */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {myDocuments.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <FileX
                                        size={48}
                                        className="mx-auto mb-4 opacity-50"
                                    />
                                    <p>저장된 문서가 없습니다.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {myDocuments.map((doc) => {
                                        // JSON 파싱하여 제목 추출
                                        let docData = {};
                                        try {
                                            docData = JSON.parse(
                                                doc.doc_content,
                                            );
                                        } catch (e) {
                                            docData = { title: "제목 없음" };
                                        }

                                        const title =
                                            docData.title ||
                                            docData.subject ||
                                            `문서 #${doc.wr_id}`;
                                        const docTypeLabel =
                                            {
                                                personal: "개인문서",
                                                business: "업무문서",
                                                project: "프로젝트문서",
                                            }[doc.doc_type] || doc.doc_type;

                                        return (
                                            <div
                                                key={doc.wr_id}
                                                onClick={() => {
                                                    loadDocument(doc.wr_id);
                                                    setShowDocumentList(false);
                                                }}
                                                className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition-colors"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-lg mb-1">
                                                            {title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                {docTypeLabel}
                                                            </span>
                                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                                                                {
                                                                    doc.report_type
                                                                }
                                                            </span>
                                                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                                                등급:{" "}
                                                                {doc.doc_grade}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 mt-2">
                                                            작성일:{" "}
                                                            {doc.wr_datetime}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-blue-600">
                                                        <span className="text-sm">
                                                            불러오기
                                                        </span>
                                                        <ChevronRight
                                                            size={20}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* 모달 푸터 */}
                        <div className="border-t p-4 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                    총 {myDocuments.length}개의 문서
                                </span>
                                <button
                                    onClick={() => setShowDocumentList(false)}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocuApp;
