$(document).ready(function() {
    function loadFileList() {
        fetch('/api/files')
            .then(response => response.json())
            .then(files => {
                if (files.error) {
                    alert('エラー: ' + files.error);
                    return;
                }
                const $fileList = $('#file-list');
                $fileList.empty();
                if (files.length === 0) {
                    $fileList.append('<li class="list-group-item">ファイルが見つかりません。</li>');
                } else {
                    files.forEach(file => {
                        $fileList.append(`<li class="list-group-item">${file}</li>`);
                    });
                }
            })
            .catch(error => {
                console.error('File list error:', error);
                alert('ファイルリストの取得に失敗しました。');
            });
    }

    loadFileList();
});
