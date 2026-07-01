import { useState, useEffect, useCallback, useRef } from 'react';
import ProjectManager from './components/ProjectManager';
import ImageList from './components/ImageList';
import LabelCanvas from './components/LabelCanvas';
import LabelPanel from './components/LabelPanel';
import Toolbar from './components/Toolbar';
import './App.css';

function useResizable(initialWidth, minWidth = 100, maxWidth = 600) {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const dirRef = useRef(1); // 1 = drag right increases, -1 = drag right decreases

  const startResize = useCallback((e, direction = 1) => {
    e.preventDefault();
    dragging.current = true;
    dirRef.current = direction;
    startX.current = e.clientX;
    startW.current = width;

    const onMouseMove = (ev) => {
      if (!dragging.current) return;
      const delta = (ev.clientX - startX.current) * dirRef.current;
      const newW = Math.min(Math.max(startW.current + delta, minWidth), maxWidth);
      setWidth(newW);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width, minWidth, maxWidth]);

  return [width, startResize];
}

export default function App() {
  const [activeProject, setActiveProject] = useState(null);
  const [classes, setClasses] = useState([]);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [savedBoxes, setSavedBoxes] = useState([]);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState(-1);
  const [currentClass, setCurrentClass] = useState(0);
  const [mode, setMode] = useState('select');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loadError, setLoadError] = useState('');
  const [sidebarWidth, startSidebarResize] = useResizable(240, 150, 500);
  const [panelWidth, startPanelResize] = useResizable(260, 150, 500);

  // Undo/Redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const skipHistoryRef = useRef(false);

  const pushHistory = useCallback(
    (newBoxes) => {
      if (skipHistoryRef.current) {
        skipHistoryRef.current = false;
        return;
      }
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newBoxes)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const handleBoxesChange = useCallback(
    (newBoxes) => {
      setBoxes(newBoxes);
      pushHistory(newBoxes);
    },
    [pushHistory]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      skipHistoryRef.current = true;
      setBoxes(JSON.parse(JSON.stringify(history[newIdx])));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      skipHistoryRef.current = true;
      setBoxes(JSON.parse(JSON.stringify(history[newIdx])));
    }
  }, [history, historyIndex]);

  // 프로젝트 선택 → 로드
  const handleProjectSelect = async (project) => {
    setLoadError('');
    try {
      const res = await fetch(`/api/projects/${project.id}/load`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || '프로젝트 로드 실패');
        return;
      }
      setActiveProject(project);
      setClasses(data.classes);
      setImages(data.images);
      setSelectedImage(null);
      setBoxes([]);
      setSavedBoxes([]);
      setHistory([]);
      setHistoryIndex(-1);
    } catch (err) {
      setLoadError('서버 연결 실패: ' + err.message);
    }
  };

  // 프로젝트 목록으로 돌아가기
  const handleBackToProjects = () => {
    setActiveProject(null);
    setClasses([]);
    setImages([]);
    setSelectedImage(null);
    setBoxes([]);
    setSavedBoxes([]);
    setHistory([]);
    setHistoryIndex(-1);
  };

  // 이미지 선택
  const handleSelectImage = async (filename) => {
    setSelectedImage(filename);
    setSelectedBoxIndex(-1);
    try {
      const res = await fetch(`/api/labels/${encodeURIComponent(filename)}`);
      const data = await res.json();
      const loadedBoxes = data.labels || [];
      setBoxes(loadedBoxes);
      setSavedBoxes(JSON.parse(JSON.stringify(loadedBoxes)));
      setHistory([JSON.parse(JSON.stringify(loadedBoxes))]);
      setHistoryIndex(0);
    } catch {
      setBoxes([]);
      setSavedBoxes([]);
      setHistory([[]]);
      setHistoryIndex(0);
    }
  };

  // 저장
  const handleSave = useCallback(async () => {
    if (!selectedImage) return;
    try {
      await fetch(`/api/labels/${encodeURIComponent(selectedImage)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: boxes }),
      });
      setSavedBoxes(JSON.parse(JSON.stringify(boxes)));
      setImages((prev) =>
        prev.map((img) =>
          img.filename === selectedImage
            ? { ...img, hasLabel: boxes.length > 0 }
            : img
        )
      );
    } catch (err) {
      alert('저장 실패: ' + err.message);
    }
  }, [selectedImage, boxes]);

  // 박스 삭제
  const handleDeleteBox = useCallback(
    (idx) => {
      const newBoxes = boxes.filter((_, i) => i !== idx);
      handleBoxesChange(newBoxes);
      setSelectedBoxIndex(-1);
    },
    [boxes, handleBoxesChange]
  );

  // 박스 클래스 변경
  const handleChangeBoxClass = useCallback(
    (idx, classId) => {
      const newBoxes = [...boxes];
      newBoxes[idx] = { ...newBoxes[idx], classId };
      handleBoxesChange(newBoxes);
    },
    [boxes, handleBoxesChange]
  );

  // 이미지 + 라벨 파일 삭제
  const handleDeleteImage = async (filename) => {
    if (!window.confirm(`"${filename}" 이미지와 라벨 파일을 삭제합니다.\n이 작업은 되돌릴 수 없습니다. 계속할까요?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/images/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || '삭제 실패');
        return;
      }
      setImages((prev) => prev.filter((img) => img.filename !== filename));
      if (selectedImage === filename) {
        setSelectedImage(null);
        setBoxes([]);
        setSavedBoxes([]);
        setSelectedBoxIndex(-1);
        setHistory([]);
        setHistoryIndex(-1);
      }
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  };

  // 완료 토글
  const handleToggleCompleted = async (filename, completed) => {
    try {
      await fetch(`/api/completed/${encodeURIComponent(filename)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      setImages((prev) =>
        prev.map((img) =>
          img.filename === filename ? { ...img, completed } : img
        )
      );
    } catch (err) {
      alert('완료 상태 저장 실패: ' + err.message);
    }
  };

  // 키보드 단축키
  useEffect(() => {
    if (!activeProject) return;

    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Delete' && selectedBoxIndex >= 0) {
        handleDeleteBox(selectedBoxIndex);
        return;
      }
      if (e.key === 'v' || e.key === 'V') {
        if (!e.ctrlKey) setMode('select');
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        if (!e.ctrlKey) setMode('draw');
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProject, handleSave, undo, redo, selectedBoxIndex, handleDeleteBox]);

  const hasChanges = JSON.stringify(boxes) !== JSON.stringify(savedBoxes);

  // 프로젝트 목록 화면
  if (!activeProject) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>YOLO Labeling Tool</h1>
        </header>
        <div className="app-body-center">
          <ProjectManager onProjectSelect={handleProjectSelect} />
          {loadError && <div className="load-error">{loadError}</div>}
        </div>
      </div>
    );
  }

  // 라벨링 작업 화면
  return (
    <div className="app">
      <header className="app-header">
        <button className="back-btn" onClick={handleBackToProjects}>
          &larr; 프로젝트 목록
        </button>
        <h1>{activeProject.name}</h1>
        {activeProject.description && (
          <span className="project-desc">{activeProject.description}</span>
        )}
        <span className="project-path">{activeProject.path}</span>
      </header>

      <div className="app-body">
        <aside className="sidebar" style={{ width: sidebarWidth }}>
          <ImageList
            images={images}
            selectedImage={selectedImage}
            onSelectImage={handleSelectImage}
            onToggleCompleted={handleToggleCompleted}
            onDeleteImage={handleDeleteImage}
          />
        </aside>
        <div
          className="resize-handle"
          onMouseDown={(e) => startSidebarResize(e, 1)}
        />

        <main className="main-area">
          <Toolbar
            mode={mode}
            onModeChange={setMode}
            onSave={handleSave}
            onUndo={undo}
            onRedo={redo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            hasChanges={hasChanges}
          />
          <LabelCanvas
            imageUrl={
              selectedImage
                ? `/api/images/${encodeURIComponent(selectedImage)}`
                : null
            }
            boxes={boxes}
            classes={classes}
            selectedBoxIndex={selectedBoxIndex}
            mode={mode}
            currentClass={currentClass}
            onBoxesChange={handleBoxesChange}
            onSelectBox={setSelectedBoxIndex}
            zoom={zoom}
            offset={offset}
            onZoomChange={setZoom}
            onOffsetChange={setOffset}
          />
        </main>

        <div
          className="resize-handle"
          onMouseDown={(e) => startPanelResize(e, -1)}
        />
        <aside className="panel" style={{ width: panelWidth }}>
          <LabelPanel
            classes={classes}
            currentClass={currentClass}
            onClassChange={setCurrentClass}
            boxes={boxes}
            selectedBoxIndex={selectedBoxIndex}
            onSelectBox={setSelectedBoxIndex}
            onDeleteBox={handleDeleteBox}
            onChangeBoxClass={handleChangeBoxClass}
            onBatchReplace={() => {
              if (selectedImage) handleSelectImage(selectedImage);
            }}
          />
        </aside>
      </div>
    </div>
  );
}
