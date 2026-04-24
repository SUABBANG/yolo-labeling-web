import { useRef, useEffect, useState, useCallback } from 'react';
import { toPixel, getClassColor } from '../utils/yolo';

const HANDLE_SIZE = 6;

function getHandles(box) {
  const { x, y, w, h } = box;
  return [
    { cursor: 'nw-resize', hx: x, hy: y },
    { cursor: 'n-resize', hx: x + w / 2, hy: y },
    { cursor: 'ne-resize', hx: x + w, hy: y },
    { cursor: 'w-resize', hx: x, hy: y + h / 2 },
    { cursor: 'e-resize', hx: x + w, hy: y + h / 2 },
    { cursor: 'sw-resize', hx: x, hy: y + h },
    { cursor: 's-resize', hx: x + w / 2, hy: y + h },
    { cursor: 'se-resize', hx: x + w, hy: y + h },
  ];
}

export default function LabelCanvas({
  imageUrl,
  boxes,
  classes,
  selectedBoxIndex,
  mode,
  currentClass,
  onBoxesChange,
  onSelectBox,
  zoom,
  offset,
  onZoomChange,
  onOffsetChange,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(null);
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);
  const [panning, setPanning] = useState(null);

  // 이미지 로드
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // 캔버스에서의 마우스 좌표를 이미지 좌표로 변환
  const canvasToImage = useCallback(
    (clientX, clientY) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const cx = clientX - rect.left;
      const cy = clientY - rect.top;
      return {
        x: (cx - offset.x) / zoom,
        y: (cy - offset.y) / zoom,
      };
    },
    [zoom, offset]
  );

  // 픽셀 박스 배열 생성
  const pixelBoxes = boxes.map((b) => ({
    ...toPixel(b, imgSize.w, imgSize.h),
    classId: b.classId,
  }));

  // 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;

    const container = containerRef.current;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // 이미지 영역 그림자
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 20 / zoom;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, imgRef.current.naturalWidth, imgRef.current.naturalHeight);
    ctx.shadowColor = 'transparent';

    // 이미지 그리기
    ctx.drawImage(imgRef.current, 0, 0);

    // 박스 그리기
    pixelBoxes.forEach((box, idx) => {
      const color = getClassColor(box.classId);
      const isSelected = idx === selectedBoxIndex;

      // 반투명 채우기
      ctx.fillStyle = color + '30';
      ctx.fillRect(box.x, box.y, box.w, box.h);

      // 테두리
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 3 / zoom : 2 / zoom;
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      // 라벨 텍스트
      const label = classes[box.classId] || `Class ${box.classId}`;
      const fontSize = Math.max(12, 14 / zoom);
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textMetrics = ctx.measureText(label);
      const textH = fontSize + 4;
      const textW = textMetrics.width + 8;

      ctx.fillStyle = color;
      ctx.fillRect(box.x, box.y - textH, textW, textH);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, box.x + 4, box.y - 4);

      // 선택된 박스 핸들
      if (isSelected) {
        const handles = getHandles(box);
        handles.forEach((h) => {
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5 / zoom;
          const hs = HANDLE_SIZE / zoom;
          ctx.fillRect(h.hx - hs / 2, h.hy - hs / 2, hs, hs);
          ctx.strokeRect(h.hx - hs / 2, h.hy - hs / 2, hs, hs);
        });
      }
    });

    // 그리기 중인 박스
    if (drawStart && drawCurrent) {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);
      const color = getClassColor(currentClass);

      ctx.fillStyle = color + '30';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / zoom;
      ctx.setLineDash([5 / zoom, 5 / zoom]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [boxes, imgSize, selectedBoxIndex, zoom, offset, drawStart, drawCurrent, currentClass, classes, pixelBoxes]);

  // 핸들 히트 테스트
  const hitTestHandle = (imgX, imgY) => {
    if (selectedBoxIndex < 0 || selectedBoxIndex >= pixelBoxes.length)
      return null;
    const box = pixelBoxes[selectedBoxIndex];
    const handles = getHandles(box);
    const threshold = HANDLE_SIZE / zoom + 2;
    for (let i = 0; i < handles.length; i++) {
      const h = handles[i];
      if (
        Math.abs(imgX - h.hx) < threshold &&
        Math.abs(imgY - h.hy) < threshold
      ) {
        return { handleIndex: i, cursor: h.cursor };
      }
    }
    return null;
  };

  // 박스 히트 테스트
  const hitTestBox = (imgX, imgY) => {
    for (let i = pixelBoxes.length - 1; i >= 0; i--) {
      const b = pixelBoxes[i];
      if (
        imgX >= b.x &&
        imgX <= b.x + b.w &&
        imgY >= b.y &&
        imgY <= b.y + b.h
      ) {
        return i;
      }
    }
    return -1;
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // 중간 버튼 또는 Alt+클릭: 패닝
      setPanning({ startX: e.clientX, startY: e.clientY, startOffset: { ...offset } });
      return;
    }

    if (e.button !== 0) return;

    const imgPos = canvasToImage(e.clientX, e.clientY);

    if (mode === 'select') {
      // 핸들 리사이즈
      const handle = hitTestHandle(imgPos.x, imgPos.y);
      if (handle) {
        const box = pixelBoxes[selectedBoxIndex];
        setDragging({
          type: 'resize',
          handleIndex: handle.handleIndex,
          startBox: { ...box },
          startX: imgPos.x,
          startY: imgPos.y,
        });
        return;
      }

      // 박스 선택 및 이동
      const hitIdx = hitTestBox(imgPos.x, imgPos.y);
      if (hitIdx >= 0) {
        onSelectBox(hitIdx);
        const box = pixelBoxes[hitIdx];
        setDragging({
          type: 'move',
          boxIndex: hitIdx,
          startBox: { ...box },
          startX: imgPos.x,
          startY: imgPos.y,
        });
      } else {
        onSelectBox(-1);
      }
    } else if (mode === 'draw') {
      setDrawStart(imgPos);
      setDrawCurrent(imgPos);
    }
  };

  const handleMouseMove = (e) => {
    // 패닝
    if (panning) {
      const dx = e.clientX - panning.startX;
      const dy = e.clientY - panning.startY;
      onOffsetChange({
        x: panning.startOffset.x + dx,
        y: panning.startOffset.y + dy,
      });
      return;
    }

    const imgPos = canvasToImage(e.clientX, e.clientY);

    // 그리기 모드
    if (mode === 'draw' && drawStart) {
      setDrawCurrent(imgPos);
      return;
    }

    // 이동
    if (dragging?.type === 'move') {
      const dx = imgPos.x - dragging.startX;
      const dy = imgPos.y - dragging.startY;
      const newBoxes = [...boxes];
      const orig = dragging.startBox;
      const newX = orig.x + dx;
      const newY = orig.y + dy;
      newBoxes[dragging.boxIndex] = {
        ...boxes[dragging.boxIndex],
        cx: (newX + orig.w / 2) / imgSize.w,
        cy: (newY + orig.h / 2) / imgSize.h,
      };
      onBoxesChange(newBoxes);
      return;
    }

    // 리사이즈
    if (dragging?.type === 'resize') {
      const dx = imgPos.x - dragging.startX;
      const dy = imgPos.y - dragging.startY;
      const orig = dragging.startBox;
      let nx = orig.x,
        ny = orig.y,
        nw = orig.w,
        nh = orig.h;

      const hi = dragging.handleIndex;
      // Top row
      if (hi <= 2) {
        ny = orig.y + dy;
        nh = orig.h - dy;
      }
      // Bottom row
      if (hi >= 5) {
        nh = orig.h + dy;
      }
      // Left col
      if (hi === 0 || hi === 3 || hi === 5) {
        nx = orig.x + dx;
        nw = orig.w - dx;
      }
      // Right col
      if (hi === 2 || hi === 4 || hi === 7) {
        nw = orig.w + dx;
      }

      // 최소 크기 보장
      if (nw < 5) { nw = 5; }
      if (nh < 5) { nh = 5; }

      const newBoxes = [...boxes];
      newBoxes[selectedBoxIndex] = {
        ...boxes[selectedBoxIndex],
        cx: (nx + nw / 2) / imgSize.w,
        cy: (ny + nh / 2) / imgSize.h,
        w: nw / imgSize.w,
        h: nh / imgSize.h,
      };
      onBoxesChange(newBoxes);
      return;
    }

    // 커서 변경
    if (mode === 'select') {
      const canvas = canvasRef.current;
      const handle = hitTestHandle(imgPos.x, imgPos.y);
      if (handle) {
        canvas.style.cursor = handle.cursor;
      } else if (hitTestBox(imgPos.x, imgPos.y) >= 0) {
        canvas.style.cursor = 'move';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  };

  const handleMouseUp = () => {
    // 패닝 종료
    if (panning) {
      setPanning(null);
      return;
    }

    // 그리기 완료
    if (mode === 'draw' && drawStart && drawCurrent) {
      const x = Math.min(drawStart.x, drawCurrent.x);
      const y = Math.min(drawStart.y, drawCurrent.y);
      const w = Math.abs(drawCurrent.x - drawStart.x);
      const h = Math.abs(drawCurrent.y - drawStart.y);

      if (w > 3 && h > 3 && imgSize.w > 0 && imgSize.h > 0) {
        const newBox = {
          classId: currentClass,
          cx: (x + w / 2) / imgSize.w,
          cy: (y + h / 2) / imgSize.h,
          w: w / imgSize.w,
          h: h / imgSize.h,
        };
        onBoxesChange([...boxes, newBox]);
        onSelectBox(boxes.length);
      }
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    setDragging(null);
  };

  // 줌 처리
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 10);

    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const newOffsetX = mx - ((mx - offset.x) / zoom) * newZoom;
    const newOffsetY = my - ((my - offset.y) / zoom) * newZoom;

    onZoomChange(newZoom);
    onOffsetChange({ x: newOffsetX, y: newOffsetY });
  };

  // 이미지를 컨테이너 중앙에 맞추는 함수
  const fitToCenter = useCallback(() => {
    const container = containerRef.current;
    if (!container || !imgSize.w || !imgSize.h) return;
    const padding = 40;
    const cw = container.clientWidth - padding * 2;
    const ch = container.clientHeight - padding * 2;
    if (cw <= 0 || ch <= 0) return;
    const scale = Math.min(cw / imgSize.w, ch / imgSize.h, 1);
    const ox = (container.clientWidth - imgSize.w * scale) / 2;
    const oy = (container.clientHeight - imgSize.h * scale) / 2;
    onZoomChange(scale);
    onOffsetChange({ x: ox, y: oy });
  }, [imgSize, onZoomChange, onOffsetChange]);

  // 이미지 로드 시 fit
  useEffect(() => {
    fitToCenter();
  }, [imgSize]);

  // 컨테이너 리사이즈 시 fit
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      fitToCenter();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [fitToCenter]);

  return (
    <div className="canvas-container" ref={containerRef}>
      {imageUrl ? (
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}
        />
      ) : (
        <div className="canvas-placeholder">
          이미지를 선택하세요
        </div>
      )}
    </div>
  );
}
