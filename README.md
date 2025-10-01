# LD-JSON Editor

このリポジトリは、LD-JSON (Line Delimited JSON) ファイルを編集するためのシンプルなWebアプリケーションです。
ブラウザ上でLD-JSONファイルの内容をテーブル表示し、行の追加、編集、削除、保存、そしてAWS S3へのアップロードが可能です。

## 主な機能

- **LD-JSONファイルの読み込み**: `raw_json` ディレクトリ内のJSONファイルをリストアップし、選択して読み込むことができます。
- **データ編集**: 読み込んだデータをテーブル形式で表示し、各行の追加、編集、削除が直感的に行えます。
- **Base64エンコード**: 特定のキーを持つ値をBase64形式にエンコードする機能があります。
- **Base64デコード表示**: Base64でエンコードされたデータを一時的にデコードして表示することができます。
- **ファイル保存**: 編集した内容は `saved_json` ディレクトリに同じファイル名で保存されます。
- **AWS S3へのアップロード**: 保存したファイルを指定したS3バケットにアップロードできます。

## 動作要件

- Python 3.x
- pip

## セットアップ方法

1.  **リポジトリをクローンします。**

```bash
git clone <repository-url>
cd json_db
```

2.  **Pythonの仮想環境を作成し、有効化します。（推奨）**

```bash
python -m venv app
source app/bin/activate  # for Mac/Linux
# app\Scripts\activate   # for Windows
```

3.  **必要なライブラリをインストールします。**

```bash
pip install -r requirements.txt
```

4.  **編集したいファイルを配置します。**
    `raw_json` ディレクトリを作成し、その中に編集したいLD-JSONファイル（`.json`, `.jsonl`, `.ldjson`）を配置してください。
    ```
    mkdir raw_json
    cp path/to/your/file.jsonl raw_json/
    ```

## 実行方法

以下のコマンドでFlaskアプリケーションを起動します。

```bash
python app.py
```

起動後、Webブラウザで `http://localhost:5001` にアクセスしてください。

## 使い方

1.  **ファイルの選択**: 画面上部のドロップダウンリストから編集したいファイルを選択し、「Load File」ボタンをクリックします。
2.  **データの編集**:
    - **追加**: 「Add New Row」フォームに必要な情報を入力し、「Add」ボタンをクリックすると新しい行が追加されます。
    - **更新**: 各行の「Edit」ボタンをクリックすると編集モードになり、内容を修正して「Save」ボタンで更新できます。
    - **削除**: 各行の「Delete」ボタンでその行を削除できます。
3.  **ファイルの保存**: 画面下部の「Save to File」ボタンをクリックすると、現在の編集内容が `saved_json` ディレクトリに保存されます。
4.  **S3へのアップロード**:
    - AWSプロファイル名、リージョン、S3バケット名を入力します。
    - （任意）S3上でのオブジェクトキーを指定します。指定しない場合は元のファイル名が使われます。
    - 「Upload to S3」ボタンをクリックすると、`saved_json` ディレクトリに保存されたファイルがS3にアップロードされます。

## ディレクトリ構成

- `app.py`: Flaskアプリケーション本体。
- `templates/index.html`: フロントエンドのHTML。
- `static/`: CSSおよびJavaScriptファイル。
- `raw_json/`: 編集対象のLD-JSONファイルを置くディレクトリ。
- `saved_json/`: 編集後に保存されるファイルの出力先ディレクトリ。
- `requirements.txt`: 依存ライブラリリスト。

## APIエンドポイント

このアプリケーションは、以下のAPIエンドポイントを提供します。

- `GET /`: メインページを表示します。
- `GET /api/files`: `raw_json` ディレクトリ内のファイルリストを返します。
- `POST /api/load_file`: 指定されたLD-JSONファイルを読み込みます。
- `GET /api/data`: 現在編集中のデータを返します。
- `POST /api/data`: 新しいデータを追加します。
- `PUT /api/data/<int:index>`: 指定したインデックスのデータを更新します。
- `DELETE /api/data/<int:index>`: 指定したインデックスのデータを削除します。
- `POST /api/decode_b64`: Base64エンコードされたデータをデコードして返します。
- `POST /api/save`: 編集中のデータをファイルに保存します。
- `POST /api/s3_upload`: 保存したファイルをS3にアップロードします。
