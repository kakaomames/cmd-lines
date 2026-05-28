import ffmpeg

def convert_av1_to_h264(input_file, output_file):
    try:
        (
            ffmpeg
            .input(input_file)
            .output(output_file, vcodec='libx264', crf=23, acodec='aac') # CRFは品質（18-28が一般的）
            .run(capture_stdout=True, capture_stderr=True)
        )
        print(f"変換完了: {output_file}")
    except ffmpeg.Error as e:
        print(f"エラー発生: {e.stderr.decode()}")

# 使用例
convert_av1_to_h264('input_av1.mp4', 'output_h264.mp4')
