import json
import os
import uuid
from pathlib import Path

from flask import Flask, jsonify, request, send_file, abort
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}
PROJECTS_FILE = os.path.join(os.path.dirname(__file__), "projects.json")

# 현재 활성 프로젝트 경로
active_project_path = None


def load_projects():
    if os.path.isfile(PROJECTS_FILE):
        with open(PROJECTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_projects(projects):
    with open(PROJECTS_FILE, "w", encoding="utf-8") as f:
        json.dump(projects, f, ensure_ascii=False, indent=2)


def get_completed_file(project_path):
    return os.path.join(project_path, "labels", ".completed.json")


def load_completed(project_path):
    completed_file = get_completed_file(project_path)
    if os.path.isfile(completed_file):
        with open(completed_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_completed(project_path, completed_list):
    labels_dir = os.path.join(project_path, "labels")
    os.makedirs(labels_dir, exist_ok=True)
    completed_file = get_completed_file(project_path)
    with open(completed_file, "w", encoding="utf-8") as f:
        json.dump(completed_list, f, ensure_ascii=False)


def build_target_stems(filenames):
    """선택된 이미지 파일명 목록을 라벨 파일 매칭용 stem 집합으로 변환.

    filenames가 비어있거나 None이면 None을 반환(= 전체 대상)."""
    if not filenames:
        return None
    return {Path(f).stem for f in filenames if f}


def scan_dataset(project_path):
    """데이터셋 경로를 스캔하여 클래스 목록과 이미지 정보를 반환"""
    images_dir = os.path.join(project_path, "images")
    labels_dir = os.path.join(project_path, "labels")
    label_file = os.path.join(project_path, "label.txt")

    if not os.path.isdir(images_dir):
        return None, "images 폴더가 존재하지 않습니다."

    classes = []
    if os.path.isfile(label_file):
        with open(label_file, "r", encoding="utf-8") as f:
            classes = [line.strip() for line in f if line.strip()]

    image_files = sorted(
        f for f in os.listdir(images_dir)
        if Path(f).suffix.lower() in IMAGE_EXTENSIONS
    )

    completed = load_completed(project_path)

    images_with_labels = []
    for img in image_files:
        stem = Path(img).stem
        label_path = os.path.join(labels_dir, f"{stem}.txt")
        images_with_labels.append({
            "filename": img,
            "hasLabel": os.path.isfile(label_path),
            "completed": img in completed,
        })

    return {
        "classes": classes,
        "images": images_with_labels,
        "totalImages": len(images_with_labels),
        "labeledImages": sum(1 for i in images_with_labels if i["hasLabel"]),
        "completedImages": len([i for i in images_with_labels if i["completed"]]),
    }, None


# ── 프로젝트 관리 API ──

@app.route("/api/projects", methods=["GET"])
def list_projects():
    projects = load_projects()
    return jsonify(projects)


@app.route("/api/projects", methods=["POST"])
def create_project():
    data = request.get_json()
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    path = data.get("path", "").strip()

    if not name:
        return jsonify({"error": "프로젝트 이름을 입력하세요."}), 400
    if not path or not os.path.isdir(path):
        return jsonify({"error": "유효하지 않은 경로입니다."}), 400

    images_dir = os.path.join(path, "images")
    if not os.path.isdir(images_dir):
        return jsonify({"error": "images 폴더가 존재하지 않습니다."}), 400

    project = {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "path": path,
    }

    projects = load_projects()
    projects.append(project)
    save_projects(projects)

    return jsonify(project), 201


@app.route("/api/projects/<project_id>", methods=["PUT"])
def update_project(project_id):
    data = request.get_json()
    projects = load_projects()

    for p in projects:
        if p["id"] == project_id:
            if "name" in data:
                p["name"] = data["name"].strip()
            if "description" in data:
                p["description"] = data["description"].strip()
            if "path" in data:
                new_path = data["path"].strip()
                if not os.path.isdir(new_path):
                    return jsonify({"error": "유효하지 않은 경로입니다."}), 400
                p["path"] = new_path
            save_projects(projects)
            return jsonify(p)

    return jsonify({"error": "프로젝트를 찾을 수 없습니다."}), 404


@app.route("/api/projects/<project_id>", methods=["DELETE"])
def delete_project(project_id):
    projects = load_projects()
    projects = [p for p in projects if p["id"] != project_id]
    save_projects(projects)
    return jsonify({"success": True})


# ── 프로젝트 데이터 API ──

@app.route("/api/projects/<project_id>/load", methods=["POST"])
def load_project(project_id):
    projects = load_projects()
    project = next((p for p in projects if p["id"] == project_id), None)

    if not project:
        return jsonify({"error": "프로젝트를 찾을 수 없습니다."}), 404

    if not os.path.isdir(project["path"]):
        return jsonify({"error": "프로젝트 경로가 존재하지 않습니다."}), 400

    global active_project_path
    active_project_path = project["path"]

    result, error = scan_dataset(project["path"])
    if error:
        return jsonify({"error": error}), 400

    return jsonify(result)


@app.route("/api/completed/<filename>", methods=["POST"])
def toggle_completed(filename):
    if not active_project_path:
        return jsonify({"error": "프로젝트가 로드되지 않았습니다."}), 400

    data = request.get_json()
    completed_flag = data.get("completed", False)

    completed = load_completed(active_project_path)
    if completed_flag and filename not in completed:
        completed.append(filename)
    elif not completed_flag and filename in completed:
        completed.remove(filename)

    save_completed(active_project_path, completed)
    return jsonify({"success": True, "completed": completed_flag})


@app.route("/api/labels/batch-replace", methods=["POST"])
def batch_replace_class():
    """프로젝트 내 모든 라벨 파일에서 특정 클래스를 다른 클래스로 일괄 변경"""
    if not active_project_path:
        return jsonify({"error": "프로젝트가 로드되지 않았습니다."}), 400

    data = request.get_json()
    from_class = data.get("fromClass")
    to_class = data.get("toClass")
    target_stems = build_target_stems(data.get("filenames"))

    if from_class is None or to_class is None:
        return jsonify({"error": "fromClass와 toClass를 지정하세요."}), 400
    if from_class == to_class:
        return jsonify({"error": "같은 클래스로는 변경할 수 없습니다."}), 400

    labels_dir = os.path.join(active_project_path, "labels")
    if not os.path.isdir(labels_dir):
        return jsonify({"error": "labels 폴더가 존재하지 않습니다."}), 400

    modified_files = 0
    modified_boxes = 0

    for fname in os.listdir(labels_dir):
        if not fname.endswith(".txt"):
            continue
        if target_stems is not None and Path(fname).stem not in target_stems:
            continue
        fpath = os.path.join(labels_dir, fname)
        lines = []
        changed = False
        with open(fpath, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 5 and int(parts[0]) == from_class:
                    parts[0] = str(to_class)
                    changed = True
                    modified_boxes += 1
                lines.append(" ".join(parts))

        if changed:
            with open(fpath, "w", encoding="utf-8") as f:
                for line in lines:
                    f.write(line + "\n")
            modified_files += 1

    return jsonify({
        "success": True,
        "modifiedFiles": modified_files,
        "modifiedBoxes": modified_boxes,
    })


@app.route("/api/labels/batch-delete", methods=["POST"])
def batch_delete_class():
    """프로젝트 내 모든 라벨 파일에서 특정 클래스의 라벨(박스)을 일괄 제거"""
    if not active_project_path:
        return jsonify({"error": "프로젝트가 로드되지 않았습니다."}), 400

    data = request.get_json()
    target_class = data.get("classId")
    target_stems = build_target_stems(data.get("filenames"))

    if target_class is None:
        return jsonify({"error": "classId를 지정하세요."}), 400

    try:
        target_class = int(target_class)
    except (ValueError, TypeError):
        return jsonify({"error": "classId는 정수여야 합니다."}), 400

    labels_dir = os.path.join(active_project_path, "labels")
    if not os.path.isdir(labels_dir):
        return jsonify({"error": "labels 폴더가 존재하지 않습니다."}), 400

    modified_files = 0
    deleted_boxes = 0

    for fname in os.listdir(labels_dir):
        if not fname.endswith(".txt"):
            continue
        if target_stems is not None and Path(fname).stem not in target_stems:
            continue
        fpath = os.path.join(labels_dir, fname)
        lines = []
        changed = False
        with open(fpath, "r", encoding="utf-8") as f:
            for line in f:
                parts = line.strip().split()
                if not parts:
                    continue
                try:
                    line_class = int(float(parts[0]))
                except ValueError:
                    # 클래스 ID를 해석할 수 없는 줄은 그대로 보존
                    lines.append(" ".join(parts))
                    continue
                if len(parts) >= 5 and line_class == target_class:
                    changed = True
                    deleted_boxes += 1
                    continue
                lines.append(" ".join(parts))

        if changed:
            with open(fpath, "w", encoding="utf-8") as f:
                for line in lines:
                    f.write(line + "\n")
            modified_files += 1

    return jsonify({
        "success": True,
        "modifiedFiles": modified_files,
        "deletedBoxes": deleted_boxes,
    })


@app.route("/api/images/<filename>", methods=["DELETE"])
def delete_image(filename):
    """이미지 파일과 해당 라벨 파일을 삭제하고 완료 목록에서 제거"""
    if not active_project_path:
        return jsonify({"error": "프로젝트가 로드되지 않았습니다."}), 400

    # 경로 조작 방지
    if filename != os.path.basename(filename):
        return jsonify({"error": "잘못된 파일 이름입니다."}), 400

    image_path = os.path.join(active_project_path, "images", filename)
    if not os.path.isfile(image_path):
        return jsonify({"error": "이미지를 찾을 수 없습니다."}), 404

    os.remove(image_path)

    stem = Path(filename).stem
    label_path = os.path.join(active_project_path, "labels", f"{stem}.txt")
    if os.path.isfile(label_path):
        os.remove(label_path)

    completed = load_completed(active_project_path)
    if filename in completed:
        completed.remove(filename)
        save_completed(active_project_path, completed)

    return jsonify({"success": True})


@app.route("/api/images/<path:filename>")
def serve_image(filename):
    if not active_project_path:
        abort(400, "프로젝트가 로드되지 않았습니다.")

    image_path = os.path.join(active_project_path, "images", filename)
    if not os.path.isfile(image_path):
        abort(404, "이미지를 찾을 수 없습니다.")

    return send_file(image_path)


@app.route("/api/labels/<filename>", methods=["GET"])
def get_labels(filename):
    if not active_project_path:
        return jsonify({"error": "프로젝트가 로드되지 않았습니다."}), 400

    stem = Path(filename).stem
    label_path = os.path.join(active_project_path, "labels", f"{stem}.txt")

    if not os.path.isfile(label_path):
        return jsonify({"labels": []})

    labels = []
    with open(label_path, "r", encoding="utf-8") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 5:
                labels.append({
                    "classId": int(parts[0]),
                    "cx": float(parts[1]),
                    "cy": float(parts[2]),
                    "w": float(parts[3]),
                    "h": float(parts[4]),
                })

    return jsonify({"labels": labels})


@app.route("/api/labels/<filename>", methods=["POST"])
def save_labels(filename):
    if not active_project_path:
        return jsonify({"error": "프로젝트가 로드되지 않았습니다."}), 400

    data = request.get_json()
    labels = data.get("labels", [])

    stem = Path(filename).stem
    labels_dir = os.path.join(active_project_path, "labels")
    os.makedirs(labels_dir, exist_ok=True)
    label_path = os.path.join(labels_dir, f"{stem}.txt")

    with open(label_path, "w", encoding="utf-8") as f:
        for lbl in labels:
            f.write(f"{lbl['classId']} {lbl['cx']:.6f} {lbl['cy']:.6f} {lbl['w']:.6f} {lbl['h']:.6f}\n")

    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
