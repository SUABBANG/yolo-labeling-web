export default function Toolbar({
  mode,
  onModeChange,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasChanges,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className={`tool-btn ${mode === 'select' ? 'active' : ''}`}
          onClick={() => onModeChange('select')}
          title="선택 모드 (V)"
        >
          ◇ 선택
        </button>
        <button
          className={`tool-btn ${mode === 'draw' ? 'active' : ''}`}
          onClick={() => onModeChange('draw')}
          title="그리기 모드 (D)"
        >
          ▢ 그리기
        </button>
      </div>
      <div className="toolbar-group">
        <button
          className="tool-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="실행취소 (Ctrl+Z)"
        >
          ↩ 취소
        </button>
        <button
          className="tool-btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="다시실행 (Ctrl+Shift+Z)"
        >
          ↪ 다시
        </button>
      </div>
      <div className="toolbar-group">
        <button
          className={`tool-btn save-btn ${hasChanges ? 'has-changes' : ''}`}
          onClick={onSave}
          title="저장 (Ctrl+S)"
        >
          💾 저장
        </button>
      </div>
    </div>
  );
}
