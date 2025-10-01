$(document).ready(function() {
    $('#list-s3-files-button').click(function() {
        const aws_profile = $('#aws_profile').val();
        const aws_region = $('#aws_region').val();
        const s3_bucket = $('#s3_bucket').val();

        if (!aws_region || !s3_bucket) {
            alert('AWSリージョンとS3バケット名を入力してください。');
            return;
        }

        $('#bucket-name-title').text(`バケット: ${s3_bucket}`);
        const $fileList = $('#s3-file-list');
        $fileList.empty().append('<li class="list-group-item">ファイルリストを取得中...</li>');

        fetch('/api/s3_files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                aws_profile: aws_profile,
                aws_region: aws_region,
                s3_bucket: s3_bucket,
            }),
        })
        .then(response => response.json())
        .then(data => {
            $fileList.empty();
            if (data.error) {
                $fileList.append(`<li class="list-group-item list-group-item-danger">${data.error}</li>`);
            } else if (data.files.length === 0) {
                $fileList.append('<li class="list-group-item">ファイルが見つかりません。</li>');
            } else {
                data.files.forEach(file => {
                    $fileList.append(`<li class="list-group-item">${file}</li>`);
                });
            }
        })
        .catch(error => {
            console.error('S3 file list error:', error);
            $fileList.empty().append('<li class="list-group-item list-group-item-danger">ファイルリストの取得に失敗しました。</li>');
        });
    });
});
