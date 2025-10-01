import base64
import json
import os

import boto3
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# ディレクトリのセットアップ
RAW_JSON_DIR = 'raw_json'
SAVED_JSON_DIR = 'saved_json'
os.makedirs(RAW_JSON_DIR, exist_ok=True)
os.makedirs(SAVED_JSON_DIR, exist_ok=True)

# グローバル変数としてデータを保持（デモ用）
# 本番環境では、セッションやデータベースで管理することを推奨
ld_json_data = []
current_filename = None  # パスではなくファイル名だけを保持


@app.route('/')
def index():
    """メインページを表示します。"""
    return render_template('index.html')


@app.route('/files')
def show_files():
    """ファイル一覧ページを表示します。"""
    return render_template('file_list.html')


@app.route('/api/files')
def list_files():
    """raw_jsonディレクトリ内のファイルリストを返します。"""
    try:
        files = [f for f in os.listdir(RAW_JSON_DIR) if f.endswith(('.json', '.jsonl', '.ldjson'))]
        return jsonify(files)
    except Exception as e:
        return jsonify({"error": f"ファイルリストの取得中にエラーが発生しました: {str(e)}"}), 500


@app.route('/api/load_file', methods=['POST'])
def load_file():
    """指定されたLD-JSONファイルを読み込み、内容をパースして返します。"""
    global ld_json_data, current_filename

    req_data = request.json
    filename = req_data.get('filename')

    if not filename:
        return jsonify({"error": "ファイル名が指定されていません"}), 400

    try:
        filepath = os.path.join(RAW_JSON_DIR, filename)
        if not os.path.isfile(filepath):
             return jsonify({"error": f"ファイルが見つかりません: {filename}"}), 404

        current_filename = filename

        ld_json_data = []
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip():
                    ld_json_data.append(json.loads(line))

        return jsonify(ld_json_data)
    except Exception as e:
        return jsonify({"error": f"ファイルの処理中にエラーが発生しました: {str(e)}"}), 500



@app.route('/api/data', methods=['GET'])
def get_data():
    """現在のJSONデータを返します。"""
    return jsonify(ld_json_data)


@app.route('/api/data', methods=['POST'])
def add_data():
    """新しいデータを追加します。"""
    global ld_json_data
    try:
        new_item = request.json
        # Base64エンコードの処理
        if new_item.get('__encode_b64__'):
            for key, value in new_item.items():
                if key != '__encode_b64__':
                    new_item[key] = base64.b64encode(str(value).encode('utf-8')).decode('utf-8')
            del new_item['__encode_b64__']

        ld_json_data.append(new_item)
        return jsonify(new_item), 201
    except Exception as e:
        return jsonify({"error": f"データの追加中にエラーが発生しました: {str(e)}"}), 400


@app.route('/api/data/<int:index>', methods=['PUT'])
def update_data(index):
    """指定されたインデックスのデータを更新します。"""
    global ld_json_data
    if 0 <= index < len(ld_json_data):
        try:
            updated_item = request.json
            # Base64エンコードの処理
            if updated_item.get('__encode_b64__'):
                for key, value in updated_item.items():
                    if key != '__encode_b64__':
                        updated_item[key] = base64.b64encode(str(value).encode('utf-8')).decode('utf-8')
                del updated_item['__encode_b64__']

            ld_json_data[index] = updated_item
            return jsonify(updated_item)
        except Exception as e:
            return jsonify({"error": f"データの更新中にエラーが発生しました: {str(e)}"}), 400
    return jsonify({"error": "インデックスが範囲外です"}), 404


@app.route('/api/data/<int:index>', methods=['DELETE'])
def delete_data(index):
    """指定されたインデックスのデータを削除します。"""
    global ld_json_data
    if 0 <= index < len(ld_json_data):
        deleted_item = ld_json_data.pop(index)
        return jsonify(deleted_item)
    return jsonify({"error": "インデックスが範囲外です"}), 404


@app.route('/api/decode_b64', methods=['POST'])
def decode_b64():
    """指定されたデータをBase64デコードします。"""
    try:
        data = request.json
        decoded_data = {}
        for key, value in data.items():
            try:
                decoded_data[key] = base64.b64decode(str(value)).decode('utf-8')
            except Exception:
                decoded_data[key] = value  # デコード失敗時は元の値
        return jsonify(decoded_data)
    except Exception as e:
        return jsonify({"error": f"デコード中にエラーが発生しました: {str(e)}"}), 400


@app.route('/api/save', methods=['POST'])
def save_file():
    """現在のデータをLD-JSON形式でファイルに保存します。"""
    global ld_json_data, current_filename
    
    try:
        # フロントエンドから送信された最新のデータでサーバー側のデータを更新
        updated_data = request.get_json(force=True)
        if updated_data is None:
            return jsonify({"error": "保存するデータがありません"}), 400
        
        # データ本体とファイル名を取得
        ld_json_data = updated_data.get('data', [])
        filename = updated_data.get('filename')

        if not filename:
            if not current_filename:
                return jsonify({"error": "保存対象のファイルがありません"}), 400
            filename = current_filename
        else:
            current_filename = filename


        save_path = os.path.join(SAVED_JSON_DIR, filename)
        with open(save_path, 'w', encoding='utf-8') as f:
            for item in ld_json_data:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
        return jsonify({"message": f"ファイルが {save_path} に保存されました"})
    except Exception as e:
        return jsonify({"error": f"ファイルの保存中にエラーが発生しました: {str(e)}"}), 500


@app.route('/api/s3_upload', methods=['POST'])
def s3_upload():
    """ファイルをS3にアップロードします。"""
    global current_filename
    data = request.json
    aws_profile = data.get('aws_profile')
    aws_region = data.get('aws_region')
    s3_bucket = data.get('s3_bucket')
    s3_key = data.get('s3_key')

    if not current_filename:
        return jsonify({"error": "アップロード対象のファイルがありません"}), 400

    # S3キーが指定されていない場合は、保存されたファイル名を使用
    if not s3_key:
        s3_key = current_filename

    saved_filepath = os.path.join(SAVED_JSON_DIR, current_filename)

    if not os.path.exists(saved_filepath):
        return jsonify({"error": f"保存されたファイルが見つかりません: {saved_filepath}。先に保存を実行してください。"}), 400

    if not all([aws_region, s3_bucket]):
        return jsonify({"error": "必要な情報（リージョン、バケット）が不足しています"}), 400

    try:
        session = boto3.Session(profile_name=aws_profile, region_name=aws_region)
        s3 = session.client('s3')
        s3.upload_file(
            saved_filepath, 
            s3_bucket, 
            s3_key,
            ExtraArgs={'ContentType': 'application/json'}
        )
        return jsonify({"message": f"ファイル {saved_filepath} が s3://{s3_bucket}/{s3_key} にアップロードされました"})
    except Exception as e:
        return jsonify({"error": f"S3へのアップロード中にエラーが発生しました: {str(e)}"}), 500


@app.route('/s3_files')
def show_s3_files():
    """S3ファイル一覧ページを表示します。"""
    return render_template('s3_list.html')


@app.route('/api/s3_files', methods=['POST'])
def list_s3_files():
    """S3バケット内のファイルリストを返します。"""
    data = request.json
    aws_profile = data.get('aws_profile')
    aws_region = data.get('aws_region')
    s3_bucket = data.get('s3_bucket')
    s3_prefix = data.get('s3_prefix', '')

    if not all([aws_region, s3_bucket]):
        return jsonify({"error": "必要な情報（リージョン、バケット）が不足しています"}), 400

    try:
        session = boto3.Session(profile_name=aws_profile, region_name=aws_region)
        s3 = session.client('s3')
        response = s3.list_objects_v2(Bucket=s3_bucket, Prefix=s3_prefix)
        files = [content['Key'] for content in response.get('Contents', [])]
        return jsonify({"files": files})
    except Exception as e:
        return jsonify({"error": f"S3からのファイルリスト取得中にエラーが発生しました: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
