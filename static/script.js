$(document).ready(function() {
    let data = [];
    let headers = [];
    let currentEditIndex = null;

    // ページの読み込み時にファイルリストを取得
    function loadFileList() {
        fetch('/api/files')
            .then(response => response.json())
            .then(files => {
                if (files.error) {
                    alert('エラー: ' + files.error);
                    return;
                }
                const $fileSelector = $('#fileSelector');
                $fileSelector.empty().append('<option value="">-- ファイルを選択 --</option>');
                files.forEach(file => {
                    $fileSelector.append(`<option value="${file}">${file}</option>`);
                });
            })
            .catch(error => {
                console.error('File list error:', error);
                alert('ファイルリストの取得に失敗しました。');
            });
    }

    loadFileList(); // 初期読み込み

    // 1. ファイル読み込み
    $('#loadButton').on('click', function() {
        const selectedFile = $('#fileSelector').val();
        if (!selectedFile) {
            alert('ファイルを選択してください。');
            return;
        }

        fetch('/api/load_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: selectedFile })
        })
        .then(response => response.json())
        .then(responseData => {
            if (responseData.error) {
                alert('エラー: ' + responseData.error);
                return;
            }
            data = responseData;
            renderTable();
            const now = new Date();
            const timeString = now.toLocaleTimeString('ja-JP');
            $('#fileInfo').text(`読み込みファイル: ${selectedFile} (${timeString})`);
        })
        .catch(error => {
            console.error('Load error:', error);
            alert('ファイルの読み込みに失敗しました。');
            $('#fileInfo').text('');
        });
    });

    // テーブルのレンダリング
    function renderTable() {
        const $thead = $('#dataThead');
        const $tbody = $('#dataTbody');
        $thead.empty();
        $tbody.empty();

        if (data.length === 0) {
            return;
        }

        // ヘッダーの作成
        headers = Array.from(data.reduce((acc, row) => {
            Object.keys(row).forEach(key => acc.add(key));
            return acc;
        }, new Set()));
        
        let headerHtml = '<tr><th>#</th>';
        headers.forEach(h => headerHtml += `<th>${h}</th>`);
        headerHtml += '<th>操作</th></tr>';
        $thead.html(headerHtml);

        // ボディの作成
        data.forEach((row, index) => {
            let rowHtml = `<tr><td>${index + 1}</td>`;
            headers.forEach(h => {
                const value = row[h] !== undefined ? row[h] : '';
                rowHtml += `<td title="${escapeHtml(value)}">${escapeHtml(value)}</td>`;
            });
            rowHtml += `
                <td class="action-buttons">
                    <button class="btn btn-sm btn-info decode-btn" data-index="${index}">デコード</button>
                    <button class="btn btn-sm btn-primary edit-btn" data-index="${index}">編集</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-index="${index}">削除</button>
                </td>`;
            rowHtml += '</tr>';
            $tbody.append(rowHtml);
        });
    }

    // HTMLエスケープ
    function escapeHtml(str) {
        if (typeof str !== 'string') {
            str = String(str);
        }
        return str.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    // 行の追加
    $('#addRow').on('click', function() {
        currentEditIndex = null; // 新規追加モード
        $('#jsonEditor').val(JSON.stringify({}, null, 2));
        $('#encodeB64').prop('checked', false);
        $('#editModalLabel').text('行の追加');
        $('#editModal').modal('show');
    });

    // 編集ボタン
    $(document).on('click', '.edit-btn', function() {
        currentEditIndex = $(this).data('index');
        const rowData = data[currentEditIndex];
        $('#jsonEditor').val(JSON.stringify(rowData, null, 2));
        $('#encodeB64').prop('checked', false);
        $('#editModalLabel').text(`行 ${currentEditIndex + 1} の編集`);
        $('#editModal').modal('show');
    });
    
    // デコードボタン
    $(document).on('click', '.decode-btn', function() {
        const index = $(this).data('index');
        const rowData = data[index];
        
        fetch('/api/decode_b64', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rowData)
        })
        .then(response => response.json())
        .then(decodedData => {
             if (decodedData.error) {
                alert('エラー: ' + decodedData.error);
                return;
            }
            // 編集モーダルにデコードされたデータを表示
            currentEditIndex = index;
            $('#jsonEditor').val(JSON.stringify(decodedData, null, 2));
            $('#encodeB64').prop('checked', false);
            $('#editModalLabel').text(`行 ${index + 1} のデコード結果 (編集可)`);
            $('#editModal').modal('show');
        })
        .catch(error => {
            console.error('Decode error:', error);
            alert('デコードに失敗しました。');
        });
    });


    // 変更を保存 (モーダル)
    $('#saveChanges').on('click', function() {
        let updatedItem;
        try {
            updatedItem = JSON.parse($('#jsonEditor').val());
        } catch (e) {
            alert('JSONの形式が正しくありません。');
            return;
        }

        if ($('#encodeB64').is(':checked')) {
            updatedItem['__encode_b64__'] = true;
        }

        const url = currentEditIndex !== null ? `/api/data/${currentEditIndex}` : '/api/data';
        const method = currentEditIndex !== null ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedItem)
        })
        .then(response => response.json())
        .then(responseData => {
            if (responseData.error) {
                alert('エラー: ' + responseData.error);
                return;
            }
            // データ再取得 & テーブル再描画
            return fetch('/api/data');
        })
        .then(response => response.json())
        .then(allData => {
            data = allData;
            renderTable();
            $('#editModal').modal('hide');
        })
        .catch(error => {
            console.error('Save error:', error);
            alert('データの保存に失敗しました。');
        });
    });

    // 削除ボタン
    $(document).on('click', '.delete-btn', function() {
        const index = $(this).data('index');
        if (!confirm(`行 ${index + 1} を削除しますか？`)) {
            return;
        }

        fetch(`/api/data/${index}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(responseData => {
            if (responseData.error) {
                alert('エラー: ' + responseData.error);
                return;
            }
             // データ再取得 & テーブル再描画
            return fetch('/api/data');
        })
        .then(response => response.json())
        .then(allData => {
            data = allData;
            renderTable();
        })
        .catch(error => {
            console.error('Delete error:', error);
            alert('データの削除に失敗しました。');
        });
    });

    // ローカルに保存
    $('#saveButton').on('click', function() {
        fetch('/api/save', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(responseData => {
            if (responseData.error) {
                alert('エラー: ' + responseData.error);
                return;
            }
            alert(responseData.message);
        })
        .catch(error => {
            console.error('Save error:', error);
            alert('ファイルの保存に失敗しました。');
        });
    });

    // S3にアップロード
    $('#s3UploadButton').on('click', function() {
        const s3Config = {
            aws_profile: $('#awsProfile').val() || null,
            aws_region: $('#awsRegion').val(),
            s3_bucket: $('#s3Bucket').val(),
            s3_key: $('#s3Key').val() || null // 空の場合はサーバー側でファイル名が使われる
        };

        if (!s3Config.aws_region || !s3Config.s3_bucket) {
            alert('リージョンとS3バケットは必須です。');
            return;
        }
        
        // まずローカルに保存
        fetch('/api/save', { method: 'POST' })
        .then(res => res.json())
        .then(saveRes => {
            if (saveRes.error) {
                alert('S3アップロードの前にローカル保存に失敗しました: ' + saveRes.error);
                throw new Error('Local save failed');
            }
            // S3アップロード実行
            return fetch('/api/s3_upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(s3Config)
            });
        })
        .then(response => response.json())
        .then(responseData => {
            if (responseData.error) {
                alert('エラー: ' + responseData.error);
                return;
            }
            alert(responseData.message);
        })
        .catch(error => {
            if (error.message !== 'Local save failed') {
              console.error('S3 Upload error:', error);
              alert('S3へのアップロードに失敗しました。');
            }
        });
    });
});
