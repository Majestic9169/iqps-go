import { A } from "@solidjs/router";
import { Component, For, createSignal } from "solid-js";
import { FileCard } from "../components/FileCard";
import toast, { Toaster } from "solid-toast";
import { AiOutlineCloudUpload as UploadIcon, AiOutlineFileAdd as FileAddIcon } from "solid-icons/ai";
import { IoSearch as SearchIcon } from "solid-icons/io";
import { autofillData, sanitizeQP } from "../utils/autofillData";
import { IQuestionPaperFile } from "../types/question_paper";
import Modal from "../components/EditModal";
import { Spinner } from "../components/Spinner";
import { validate } from "../utils/validateInput";
import { makeRequest } from "../utils/backend";

const UploadPage: Component = () => {
    let MAX_UPLOAD_LIMIT = parseInt(import.meta.env.VITE_MAX_UPLOAD_LIMIT)
    if (isNaN(MAX_UPLOAD_LIMIT) || MAX_UPLOAD_LIMIT < 1) {
        MAX_UPLOAD_LIMIT = 10
    }
    const [qPapers, setQPapers] = createSignal<IQuestionPaperFile[]>([]);
    const [isDragging, setIsDragging] = createSignal(false);
    const [selectedQPaper, setSelectedQPaper] =
        createSignal<IQuestionPaperFile | null>(null);
    const [awaitingResponse, setAwaitingResponse] =
        createSignal<boolean>(false);

    let fileInputRef!: HTMLInputElement;

    // state modifying actions
    const removeQPaper = (filename: string) => {
        setQPapers((prevQPs) =>
            prevQPs.filter((qp) => qp.file.name !== filename)
        );
    };

    const addQPapers = async (newFiles: File[]) => {
        try {
            setAwaitingResponse(true); // Set loading state to true
            const newQPsPromises = newFiles.map(async (newFile) => {
                const qpDetails = await autofillData(newFile.name, newFile);
                return { file: newFile, ...qpDetails };
            });

            const newQPs = await Promise.all(newQPsPromises);

            if (newQPs.length > 0) {
                setQPapers((prevQPs) => [...prevQPs, ...newQPs]);
            }
        } catch (error) {
            console.error('Error adding question papers:', error);
        } finally {
            setAwaitingResponse(false); // Set loading state to false
        }
    };

    const clearQPapers = () => setQPapers([]);
    const updateQPaper = (updated: IQuestionPaperFile) => {
        let updateData = qPapers().map((qp) => {
            if (qp.file.name == updated.file.name) return updated;
            else return qp;
        });
        setQPapers(updateData);
    };

    const openModal = (qp: IQuestionPaperFile) => {
        setSelectedQPaper(qp);
    };
    const closeModal = () => {
        setSelectedQPaper(null);
    };

    // event handlers
    const openFileDialog = (e: Event) => {
        e.stopPropagation();
        fileInputRef.click();
    };

    const onFileInputChange = async (e: Event) => {
        e.preventDefault();
        if (e.target) {
            const newFiles = Array.from(
                (e.target as HTMLInputElement).files || []
            );
            if (newFiles) {
                await addQPapers(newFiles);
            }
        }
    };

    const onFileDrop = async (e: DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) {
            const pdfFiles = [...e.dataTransfer.files].filter(
                (file) => file.type === "application/pdf"
            );
            if (pdfFiles && pdfFiles.length > 0) {
                if (pdfFiles.length > MAX_UPLOAD_LIMIT) {
                    toast.error(`max ${MAX_UPLOAD_LIMIT} files allowed`);
                    return;
                }
                await addQPapers(pdfFiles);
            } else {
                toast.error("Could not catch files. Please try again");
            }
            e.dataTransfer.clearData();
        }
        setIsDragging(false);
    };

    const onDragEnter = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const onDragExit = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleUpload = async (e: Event) => {
        e.preventDefault();
        if (qPapers().length > MAX_UPLOAD_LIMIT) {
            toast.error(`max ${MAX_UPLOAD_LIMIT} files allowed`);
            return;
        }

        const allValid = qPapers().every((qp) => isValid(qp));

        if (!allValid) {
            toast.error("Please provide correct course details");
            return;
        }

        if (!awaitingResponse()) {
            try {
                const formData = new FormData();
                const numPapers = qPapers().length;
                for (const qp of qPapers()) {
                    const {
                        file,
                        course_code,
                        course_name,
                        year,
                        exam,
                        semester,
                        file_name
                    } = await sanitizeQP(qp);

                    formData.append("files", file, file_name);
                    formData.append(
                        file_name,
                        `${course_code}_${course_name}_${year}_${exam}_${semester}`
                    );
                }
                toast(`Uploading ${numPapers} file${numPapers > 1 ? 's' : ''}.`);

                setAwaitingResponse(true);
                const response = await makeRequest('upload', 'post', formData);

                if (response.status === 'success') {
                    const upload_results = response.data;

                    for (const result of upload_results) {
                        if (result.status === "success") {
                            toast.success(
                                `File ${result.filename} uploaded successfully`
                            );
                        } else {
                            toast.error(
                                `Failed to upload file ${result.filename}: ${result.description}`
                            );
                        }
                    }

                    if (upload_results.length < numPapers) {
                        const failedPapers = numPapers - upload_results.length;
                        toast.error(`${failedPapers} paper${failedPapers > 1 ? 's' : ''} failed to upload.`);
                    }

                    clearQPapers();
                } else {
                    toast.error(`Failed to upload files. Error: ${response.message} (${response.status_code})`);
                }

                setAwaitingResponse(false);
            } catch (error) {
                toast.error("Failed to upload file due to an unknown error. Please try again later.");
                console.error("Upload error:", error);
                setAwaitingResponse(false);
            }
        }
    };

    const isValid = (data: IQuestionPaperFile) => {
        return !Object.values(validate(data)).some(Boolean);
    };

    return (
        <div class="upload-page">
            <div class="title">
                <h1>IQPS - Question Paper Upload</h1>
                <p>
                    <i>Upload your question papers for future humans to use!</i>
                </p>
                <h3 class="header-search-encourager">
                    Want to find a question paper? <A href="/" class="header-search-sender"><SearchIcon size="1.5rem" />Search!</A>
                </h3>
            </div>

            <div class="upload-wrapper">
                <div class="upload-instructions">
                    <h2 class="instruction-heading">Upload Instructions</h2>
                    <div class="instructions">
                        <div class="instruction-section">
                            <h3>File Format</h3>
                            <p>Only PDF files are accepted.</p>
                        </div>
                        <div class="instruction-section">
                            <h3>File Naming (optional)</h3>
                            <p>Use this format: <span class="file-format-example">course_code.pdf</span></p>
                            <p>
                                <strong>Example: </strong> <em>CS10001.pdf</em>
                            </p>
                        </div>
                        <div class="instruction-section">
                            <h3>How to Upload</h3>
                            <p>Click "Choose File" to select your PDF.</p>
                            <p>Click "Upload" to submit.</p>
                        </div>
                        <h3>NOTE: The uploaded paper will be searchable only after manual review process first. Please wait for a few days and do not re-upload.</h3>
                    </div>
                </div>

                <div class="upload-section">
                    {awaitingResponse() && (
                        <div class="loading">
                            <div class="spinner">
                                <Spinner />
                            </div>
                            <p class="message">
                                Loading files, please wait...
                            </p>
                        </div>
                    )}

                    {qPapers().length > 0 && !awaitingResponse() ? (
                        <>
                            <div class="uploaded-files">
                                <For each={Array.from(qPapers())}>
                                    {(qp) => (
                                        <div>
                                            <FileCard
                                                qPaper={qp}
                                                removeQPaper={removeQPaper}
                                                edit={openModal}
                                            />
                                            {!isValid(qp) && (
                                                <p class="error-msg">
                                                    Invalid course details
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </For>
                            </div>
                            <div class="upload-section-btns">
                                <button onClick={handleUpload} class="upload-btn">
                                    {awaitingResponse() ? (
                                        <>
                                            Uploading
                                            <div class="spinner">
                                                <Spinner />
                                            </div>
                                        </>
                                    ) : (
                                        <><UploadIcon size="1.5rem" />Upload</>
                                    )}
                                </button>
                                {qPapers().length <= MAX_UPLOAD_LIMIT && <button onClick={openFileDialog}>
                                    <FileAddIcon size="1.5rem" />Add More Files
                                </button>}
                            </div>
                        </>
                    ) : (
                        !awaitingResponse() && (
                            <div
                                class={`upload-area ${isDragging() && "active"}`}
                                onDragOver={onDragEnter}
                                onDragLeave={onDragExit}
                                onDrop={onFileDrop}
                                onClick={openFileDialog}
                            >
                                <input
                                    ref={(el) => (fileInputRef = el)}
                                    type="file"
                                    accept=".pdf"
                                    hidden
                                    multiple={true}
                                    onChange={onFileInputChange}
                                />
                                <UploadIcon class="upload-icon" size="5rem" />
                                <h2>Click or drop files to upload</h2>
                            </div>
                        )
                    )}
                </div>
            </div>
            <Toaster
                toastOptions={{
                    position: "bottom-center",
                    className: "toast",
                }}
            />
            {selectedQPaper() && (
                <Modal
                    close={closeModal}
                    qPaper={selectedQPaper()!}
                    update={updateQPaper}
                />
            )}
        </div>
    );
};

export default UploadPage;
