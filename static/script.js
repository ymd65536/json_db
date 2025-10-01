$(document).ready(function() {
    let data = [];
    let headers = [];
    let currentEditIndex = null;
    let selectedRowIndex = null;

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
            selectedRowIndex = null; // ファイルを再読み込みしたら選択を解除
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
        
        let headerHtml = '<tr><th></th>'; // ラジオボタン用のヘッダーセル
        headers.forEach(h => headerHtml += `<th>${h}</th>`);
        $thead.html(headerHtml);

        // ボディの作成
        data.forEach((row, index) => {
            const isSelected = index === selectedRowIndex ? 'selected-row' : '';
            const isChecked = index === selectedRowIndex ? 'checked' : '';
            let rowHtml = `<tr class="${isSelected}"><td><input type="radio" name="rowSelector" data-index="${index}" ${isChecked}></td>`;
            headers.forEach(h => {
                const value = row[h] !== undefined ? row[h] : '';
                rowHtml += `<td class="editable-cell" data-index="${index}" data-key="${h}" title="${escapeHtml(value)}">${escapeHtml(value)}</td>`;
            });
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

    // 行選択
    $(document).on('change', 'input[name="rowSelector"]', function() {
        selectedRowIndex = parseInt($(this).data('index'), 10);
        renderTable(); // 選択を反映して再描画
    });

    $('#duplicateRowBtn').on('click', function() {
        if (selectedRowIndex === null) {
            alert('操作対象の行を選択してください。');
            return;
        }
        const rowData = data[selectedRowIndex];

        // 新しい行として追加
        fetch('/api/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rowData)
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
            selectedRowIndex = data.length - 1; // 複製してできた最後の行を選択状態にする
            renderTable();
        })
        .catch(error => {
            console.error('Duplicate error:', error);
            alert('行の複製に失敗しました。');
        });
    });

    // --- 操作ボタンのイベントハンドラ ---
    $('#addRowBtn').on('click', function() {
        currentEditIndex = null; // 新規追加モード
        $('#jsonEditor').val(JSON.stringify({}, null, 2));
        $('#editModalLabel').text('行の追加');
        $('#editModal').modal('show');
    });

    $('#editRowBtn').on('click', function() {
        if (selectedRowIndex === null) {
            alert('操作対象の行を選択してください。');
            return;
        }
        currentEditIndex = selectedRowIndex;
        const rowData = data[currentEditIndex];
        $('#jsonEditor').val(JSON.stringify(rowData, null, 2));
        $('#editModalLabel').text(`行 ${currentEditIndex + 1} の編集`);
        $('#editModal').modal('show');
    });
    
    $('#decodeRowBtn').on('click', function() {
        if (selectedRowIndex === null) {
            alert('操作対象の行を選択してください。');
            return;
        }
        const rowData = data[selectedRowIndex];
        
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
            currentEditIndex = selectedRowIndex;
            $('#jsonEditor').val(JSON.stringify(decodedData, null, 2));
            $('#editModalLabel').text(`行 ${currentEditIndex + 1} の全体デコード結果 (編集可)`);
            $('#editModal').modal('show');
        })
        .catch(error => {
            console.error('Decode error:', error);
            alert('デコードに失敗しました。');
        });
    });

    $('#deleteRowBtn').on('click', function() {
        if (selectedRowIndex === null) {
            alert('操作対象の行を選択してください。');
            return;
        }
        if (!confirm(`行 ${selectedRowIndex + 1} を削除しますか？`)) {
            return;
        }

        fetch(`/api/data/${selectedRowIndex}`, {
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
            selectedRowIndex = null; // 削除後は選択解除
            renderTable();
        })
        .catch(error => {
            console.error('Delete error:', error);
            alert('データの削除に失敗しました。');
        });
    });

    // 個別Value編集
    let currentCell = { index: null, key: null };
    $(document).on('click', 'td.editable-cell', function() {
        const index = $(this).data('index');
        const key = $(this).data('key');
        currentCell = { index, key };
        
        const value = data[index][key] || '';
        $('#valueEditor').val(value);
        $('#valueEditModalLabel').text(`値の編集 (行: ${index + 1}, キー: ${key})`);
        $('#valueEditModal').modal('show');
    });

    $('#encodeValueBtn').on('click', function() {
        try {
            const currentValue = $('#valueEditor').val();
            const encodedValue = btoa(currentValue);
            $('#valueEditor').val(encodedValue);
        } catch (e) {
            alert('Base64エンコードに失敗しました。UTF-8以外の文字が含まれている可能性があります。');
        }
    });

    $('#decodeValueBtn').on('click', function() {
        try {
            const currentValue = $('#valueEditor').val();
            const decodedValue = atob(currentValue);
            $('#valueEditor').val(decodedValue);
        } catch (e) {
            alert('Base64デコードに失敗しました。正しいBase64文字列ではありません。');
        }
    });

    $('#saveValueChange').on('click', function() {
        const { index, key } = currentCell;
        if (index !== null && key !== null) {
            const newValue = $('#valueEditor').val();
            data[index][key] = newValue;
            renderTable(); // テーブルを再描画して変更を反映
            $('#valueEditModal').modal('hide');
        }
    });


    // 変更を保存 (行モーダル)
    $('#saveChanges').on('click', function() {
        let updatedItem;
        try {
            updatedItem = JSON.parse($('#jsonEditor').val());
        } catch (e) {
            alert('JSONの形式が正しくありません。');
            return;
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

    // ローカルに保存
    $('#saveButton').on('click', function() {
        fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data) // フロントエンドの現在のデータを送信
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
