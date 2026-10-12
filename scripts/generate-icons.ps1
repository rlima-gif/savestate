Add-Type -AssemblyName System.Drawing

function Generate-GamerIcon([string]$path, [int]$width, [int]$height) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

    # Background (#121214)
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 18, 18, 20))
    $g.FillRectangle($bgBrush, 0, 0, $width, $height)

    # Gamer Shield (#FF5533)
    $centerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 85, 51))
    $g.FillEllipse($centerBrush, [int]($width * 0.15), [int]($height * 0.15), [int]($width * 0.7), [int]($height * 0.7))

    # Amber Accent (#F5A623)
    $amberBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 166, 35))
    $g.FillRectangle($amberBrush, [int]($width * 0.30), [int]($height * 0.30), [int]($width * 0.40), [int]($height * 0.35))

    # D-Pad White (#FFFFFF)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillRectangle($whiteBrush, [int]($width * 0.46), [int]($height * 0.34), [int]($width * 0.08), [int]($height * 0.22))
    $g.FillRectangle($whiteBrush, [int]($width * 0.39), [int]($height * 0.41), [int]($width * 0.22), [int]($height * 0.08))

    # Button accents
    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 85, 51))
    $g.FillEllipse($dotBrush, [int]($width * 0.58), [int]($height * 0.38), [int]($width * 0.05), [int]($height * 0.05))
    $g.FillEllipse($dotBrush, [int]($width * 0.63), [int]($height * 0.43), [int]($width * 0.05), [int]($height * 0.05))

    # Text Banner
    $font = New-Object System.Drawing.Font("Arial", [float]($width * 0.055), [System.Drawing.FontStyle]::Bold)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString("SAVESTATE", $font, $whiteBrush, [float]($width * 0.5), [float]($height * 0.70), $sf)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Generated icon at $path ($width x $height)"
}

Generate-GamerIcon "apps\mobile\assets\icon.png" 1024 1024
Generate-GamerIcon "apps\mobile\assets\adaptive-icon.png" 1024 1024
Generate-GamerIcon "apps\mobile\assets\splash-icon.png" 1024 1024
