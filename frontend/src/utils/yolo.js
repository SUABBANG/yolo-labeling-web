// YOLO 정규화 좌표 → 픽셀 좌표 변환
export function toPixel(yolo, imgW, imgH) {
  const { cx, cy, w, h } = yolo;
  const bw = w * imgW;
  const bh = h * imgH;
  return {
    x: cx * imgW - bw / 2,
    y: cy * imgH - bh / 2,
    w: bw,
    h: bh,
  };
}

// 픽셀 좌표 → YOLO 정규화 좌표 변환
export function toYolo(pixel, imgW, imgH) {
  return {
    cx: (pixel.x + pixel.w / 2) / imgW,
    cy: (pixel.y + pixel.h / 2) / imgH,
    w: pixel.w / imgW,
    h: pixel.h / imgH,
  };
}

// 클래스별 고유 색상 생성
const CLASS_COLORS = [
  '#FF3838', '#FF9D97', '#FF701F', '#FFB21D', '#CFD231',
  '#48F90A', '#92CC17', '#3DDB86', '#1A9334', '#00D4BB',
  '#2C99A8', '#00C2FF', '#344593', '#6473FF', '#0018EC',
  '#8438FF', '#520085', '#CB38FF', '#FF95C8', '#FF37C7',
];

export function getClassColor(classId) {
  return CLASS_COLORS[classId % CLASS_COLORS.length];
}
