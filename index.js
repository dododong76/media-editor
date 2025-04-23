document.addEventListener("DOMContentLoaded", () => {
  // Tab switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`${tabId}Tab`).classList.add("active");
    });
  });

  // Video Editor
  const videoUploadArea = document.querySelector("#videoUploadArea");
  const videoInput = document.getElementById("videoInput");
  const videoPlayer = document.getElementById("videoPlayer");
  const videoEditorSection = document.querySelector("#videoEditorSection");
  const startTimeInput = document.getElementById("startTime");
  const endTimeInput = document.getElementById("endTime");
  const previewBtn = document.getElementById("previewBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const previewModal = document.getElementById("previewModal");
  const previewPlayer = document.getElementById("previewPlayer");
  const closeModal = document.querySelector(".close");

  let currentVideo = null;

  // Video drag and drop handlers
  videoUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    videoUploadArea.style.borderColor = "#2c3e50";
  });

  videoUploadArea.addEventListener("dragleave", () => {
    videoUploadArea.style.borderColor = "#6c757d";
  });

  videoUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    videoUploadArea.style.borderColor = "#6c757d";
    const file = e.dataTransfer.files[0];
    handleVideoFile(file);
  });

  // Video click to upload
  videoUploadArea.addEventListener("click", () => {
    videoInput.click();
  });

  videoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    handleVideoFile(file);
  });

  function handleVideoFile(file) {
    if (file && file.type.startsWith("video/")) {
      const videoURL = URL.createObjectURL(file);
      currentVideo = file;
      videoPlayer.src = videoURL;
      videoEditorSection.style.display = "block";

      videoPlayer.addEventListener("loadedmetadata", () => {
        const duration = videoPlayer.duration;
        startTimeInput.max = duration;
        endTimeInput.max = duration;
        endTimeInput.value = duration;
      });
    } else {
      alert("Please upload a valid video file.");
    }
  }

  // Video preview button handler
  previewBtn.addEventListener("click", () => {
    if (!currentVideo) return;

    const startTime = parseFloat(startTimeInput.value);
    const endTime = parseFloat(endTimeInput.value);

    if (startTime >= endTime) {
      alert("Start time must be less than end time.");
      return;
    }

    const videoURL = URL.createObjectURL(currentVideo);
    previewPlayer.src = videoURL;
    previewPlayer.currentTime = startTime;
    previewModal.style.display = "block";

    previewPlayer.play();

    const checkTime = setInterval(() => {
      if (previewPlayer.currentTime >= endTime) {
        previewPlayer.pause();
        clearInterval(checkTime);
      }
    }, 100);
  });

  // Video download button handler
  downloadBtn.addEventListener("click", async () => {
    if (!currentVideo) return;

    const startTime = parseFloat(startTimeInput.value);
    const endTime = parseFloat(endTimeInput.value);

    if (startTime >= endTime) {
      alert("Start time must be less than end time.");
      return;
    }

    try {
      const tempVideo = document.createElement("video");
      tempVideo.src = URL.createObjectURL(currentVideo);

      await new Promise((resolve) => {
        tempVideo.onloadedmetadata = resolve;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = tempVideo.videoWidth;
      canvas.height = tempVideo.videoHeight;

      const stream = canvas.captureStream();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "trimmed_video.webm";
        a.click();
        URL.revokeObjectURL(url);
      };

      mediaRecorder.start();

      tempVideo.currentTime = startTime;
      await new Promise((resolve) => {
        const drawFrame = () => {
          if (tempVideo.currentTime >= endTime) {
            mediaRecorder.stop();
            resolve();
            return;
          }
          ctx.drawImage(tempVideo, 0, 0);
          requestAnimationFrame(drawFrame);
        };
        drawFrame();
      });
    } catch (error) {
      console.error("Error processing video:", error);
      alert("Error processing video. Please try again.");
    }
  });

  // PDF Editor
  const pdfUploadArea = document.querySelector("#pdfUploadArea");
  const pdfInput = document.getElementById("pdfInput");
  const pdfViewer = document.getElementById("pdfViewer");
  const pdfEditorSection = document.querySelector("#pdfEditorSection");
  const startPageInput = document.getElementById("startPage");
  const endPageInput = document.getElementById("endPage");
  const convertToImagesBtn = document.getElementById("convertToImagesBtn");
  const splitPdfBtn = document.getElementById("splitPdfBtn");

  let currentPdf = null;
  let pdfDoc = null;

  // PDF drag and drop handlers
  pdfUploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    pdfUploadArea.style.borderColor = "#2c3e50";
  });

  pdfUploadArea.addEventListener("dragleave", () => {
    pdfUploadArea.style.borderColor = "#6c757d";
  });

  pdfUploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    pdfUploadArea.style.borderColor = "#6c757d";
    const file = e.dataTransfer.files[0];
    handlePdfFile(file);
  });

  // PDF click to upload
  pdfUploadArea.addEventListener("click", () => {
    pdfInput.click();
  });

  pdfInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    handlePdfFile(file);
  });

  async function handlePdfFile(file) {
    if (file && file.type === "application/pdf") {
      try {
        currentPdf = file;
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        pdfEditorSection.style.display = "block";
        startPageInput.max = pdfDoc.numPages;
        endPageInput.max = pdfDoc.numPages;
        endPageInput.value = pdfDoc.numPages;

        // Render first page
        await renderPdfPage(1);
      } catch (error) {
        console.error("Error loading PDF:", error);
        alert("Error loading PDF. Please try again.");
      }
    } else {
      alert("Please upload a valid PDF file.");
    }
  }

  async function renderPdfPage(pageNumber) {
    try {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      pdfViewer.innerHTML = "";
      pdfViewer.appendChild(canvas);
    } catch (error) {
      console.error("Error rendering PDF page:", error);
      alert("Error rendering PDF page. Please try again.");
    }
  }

  // Convert PDF to images
  convertToImagesBtn.addEventListener("click", async () => {
    if (!pdfDoc) return;

    const startPage = parseInt(startPageInput.value);
    const endPage = parseInt(endPageInput.value);

    if (startPage > endPage) {
      alert("Start page must be less than or equal to end page.");
      return;
    }

    try {
      for (let i = startPage; i <= endPage; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        const imageData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imageData;
        link.download = `page_${i}.png`;
        link.click();
      }
    } catch (error) {
      console.error("Error converting PDF to images:", error);
      alert("Error converting PDF to images. Please try again.");
    }
  });

  // Split PDF
  splitPdfBtn.addEventListener("click", async () => {
    if (!pdfDoc) return;

    const startPage = parseInt(startPageInput.value);
    const endPage = parseInt(endPageInput.value);

    if (startPage > endPage) {
      alert("Start page must be less than or equal to end page.");
      return;
    }

    try {
      // Create a new PDF document
      const newPdf = await pdfjsLib.PDFDocument.create();

      // Copy pages from the original document
      const pages = await newPdf.copyPages(
        pdfDoc,
        Array.from(
          { length: endPage - startPage + 1 },
          (_, i) => startPage - 1 + i
        )
      );

      // Add the copied pages to the new document
      pages.forEach((page) => newPdf.addPage(page));

      // Save the new PDF
      const pdfBytes = await newPdf.save();

      // Download the new PDF
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `split_pages_${startPage}_to_${endPage}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error splitting PDF:", error);
      alert("Error splitting PDF. Please try again.");
    }
  });

  // Close modal handlers
  closeModal.addEventListener("click", () => {
    previewModal.style.display = "none";
    previewPlayer.pause();
  });

  window.addEventListener("click", (e) => {
    if (e.target === previewModal) {
      previewModal.style.display = "none";
      previewPlayer.pause();
    }
  });
});
