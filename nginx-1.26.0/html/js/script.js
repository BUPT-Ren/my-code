// 图片编辑器脚本
// 作者：任耀东
// 创建时间：2023-03-12
// 最后修改：2025-05-15 (优化性能)

$(window).on('load', function () {
    // 设置一个1500毫秒（1.5秒）的延时
    setTimeout(function () {
        // 选择ID为'loading-screen'的元素，并执行500毫秒的淡出动画
        $('#loading-screen').fadeOut(500, function () {
            // 动画完成后，从DOM中移除该元素
            $(this).remove();
        });
    }, 1500);
});

$(document).ready(function () {
    console.log('图片编辑器启动中...');

    // 获取画布和上下文
    var canvas = document.getElementById('image-canvas');
    if (!canvas) {
        console.error('错误：找不到canvas元素！');
        alert('哎呀，页面好像有问题，找不到画布！');
        return;
    }

    // 固定canvas大小
    canvas.width = 800;
    canvas.height = 600;

    var ctx = canvas.getContext('2d');
    if (!ctx) {
        alert('抱歉，你的浏览器不支持2D绘图！');
        return;
    }

    // 主要变量
    var image = {
        img: null,
        originalImg: null, // 保存原始图片引用
        scale: 1,
        rotation: 0,
        imgX: 0,
        imgY: 0,
        textInput: '',
        textSize: 20,
        textColor: '#ff0000',
        textFont: 'Arial',
        textPos: { x: 0, y: 0 },
        isAddingText: false,
        imageOpacity: 1,
        currentFilter: 'none',
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        bgColor: '#ffffff',
        watermarkImage: null,
        watermarkPos: { x: 0, y: 0 },
        currentBorder: null,
        history: [], // 每张图片独立的历史记录
        historyIndex: -1, // 当前历史记录索引
        initialState: null // 初始状态
    };

    var images = [];
    var isDrawing = false;
    var isCropping = false;
    var cropStartX, cropStartY, cropEndX, cropEndY;
    var draggingImg = false;
    var isDraggingText = false;
    var isDraggingWatermark = false;
    var lastMousePos = { x: 0, y: 0 };

    // 历史记录常量
    var MAX_HISTORY = 100;

    // 文件选择处理
    $('#file-input').change(function (e) {
        console.log('用户选择了文件');
        var files = e.target.files;
        if (!files || files.length === 0) {
            console.log('没有选择文件');
            alert('没有选择文件');
            return;
        }

        // 清空现有图片数组
        images = [];

        Array.from(files).forEach(function (file, index) {
            console.log('处理文件:', file.name);

            var reader = new FileReader();

            reader.onload = function (ev) {
                var img = new Image();
                img.src = ev.target.result;

                img.onload = function () {
                    console.log('图片加载成功:', file.name);

                    // 调整图片大小以适应工作区
                    var maxWidth = canvas.width * 0.8;
                    var maxHeight = canvas.height * 0.8;
                    var scale = 1;

                    if (img.width > maxWidth || img.height > maxHeight) {
                        var widthScale = maxWidth / img.width;
                        var heightScale = maxHeight / img.height;
                        scale = Math.min(widthScale, heightScale);
                    }

                    // 为每张图片创建独立对象
                    var imageObj = {
                        img: img,
                        originalImg: img, // 保存原始图片引用
                        scale: scale,
                        rotation: 0,
                        imgX: 0,
                        imgY: 0,
                        textInput: '',
                        textPos: { x: 0, y: 0 },
                        textSize: 20,
                        textColor: '#ff0000',
                        textFont: 'Arial',
                        isAddingText: false,
                        imageOpacity: 1,
                        currentFilter: 'none',
                        brightness: 100,
                        contrast: 100,
                        saturation: 100,
                        blur: 0,
                        bgColor: '#ffffff',
                        currentBorder: null,
                        watermarkImage: null,
                        watermarkPos: { x: 0, y: 0 },
                        history: [],
                        historyIndex: -1,
                        initialState: null
                    };

                    // 保存初始状态
                    saveInitialState(imageObj);

                    images.push(imageObj);

                    if (index === 0) {
                        image = imageObj;
                        saveState();
                        drawImage();
                    }

                    updateImageSwitcher();
                    updateUndoRedoButtons();
                };

                img.onerror = function () {
                    console.error('图片加载失败:', file.name);
                    alert('加载图片 "' + file.name + '" 失败，可能不是有效的图片文件');
                };
            };

            reader.readAsDataURL(file);
        });
    });

    function saveInitialState(imageObj) {
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageObj.img.width;
        tempCanvas.height = imageObj.img.height;
        var tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(imageObj.img, 0, 0);

        var initialState = {
            img: tempCanvas.toDataURL(),
            originalImg: tempCanvas.toDataURL(),
            scale: imageObj.scale,
            rotation: imageObj.rotation,
            imgX: imageObj.imgX,
            imgY: imageObj.imgY,
            textInput: imageObj.textInput,
            textPos: JSON.parse(JSON.stringify(imageObj.textPos)),
            textSize: imageObj.textSize,
            textColor: imageObj.textColor,
            textFont: imageObj.textFont,
            isAddingText: imageObj.isAddingText,
            imageOpacity: imageObj.imageOpacity,
            currentFilter: imageObj.currentFilter,
            brightness: imageObj.brightness,
            contrast: imageObj.contrast,
            saturation: imageObj.saturation,
            blur: imageObj.blur,
            bgColor: imageObj.bgColor,
            currentBorder: imageObj.currentBorder ? JSON.parse(JSON.stringify(imageObj.currentBorder)) : null,
            watermarkImage: imageObj.watermarkImage ? imageObj.watermarkImage.src : null,
            watermarkPos: JSON.parse(JSON.stringify(imageObj.watermarkPos))
        };

        // 确保 history[0] 是初始状态
        imageObj.history = [initialState];  // 重置历史记录，第一个状态就是初始状态
        imageObj.historyIndex = 0;         // 当前指向初始状态
        imageObj.initialState = initialState;
    } 
    // 更新图片切换器
    function updateImageSwitcher() {
        console.log('更新图片切换器...');
        var switcher = $('#image-switcher');
        if (switcher.length === 0) {
            $('body').append('<div id="image-switcher" class="switcher"></div>');
            switcher = $('#image-switcher');
        }

        switcher.empty();

        images.forEach(function (imgObj, i) {
            var btn = $('<button>').text('图片 ' + (i + 1));
            btn.click(function () {
                console.log('切换到图片', i + 1);
                image = imgObj;
                updateUIFromImage();
                drawImage();
            });
            switcher.append(btn);
        });
    }


    // 更新UI以反映当前图片状态
    function updateUIFromImage() {
        $('#opacity').val(image.imageOpacity);
        $('#filter').val(image.currentFilter);
        $('#brightness-slider').val(image.brightness);
        $('#contrast-slider').val(image.contrast);
        $('#saturation-slider').val(image.saturation);
        $('#blur-slider').val(image.blur);
        $('#bg-color').val(image.bgColor);
        $('#text-input').val(image.textInput);
        $('#text-size').val(image.textSize);
        $('#text-color').val(image.textColor);
        $('#text-font').val(image.textFont);
        updateUndoRedoButtons();
    }

    // 旋转图片
    $('#rotate').click(function () {
        console.log('旋转图片');
        var angle = $('#rotate-angle').val();
        if (angle) {
            image.rotation += parseInt(angle);
        } else {
            alert('请输入有效的旋转角度！');
            return;
        }

        image.rotation = image.rotation % 360;
        saveState();
        drawImage();
    });

    // 缩放控制
    $('#zoom-in').click(function () {
        image.scale *= 1.1;
        console.log('放大，当前比例:', image.scale);
        saveState();
        drawImage();
    });

    $('#zoom-out').click(function () {
        image.scale /= 1.1;
        console.log('缩小，当前比例:', image.scale);
        saveState();
        drawImage();
    });

    // 透明度控制
    var opacityTimeout = null;
    $('#opacity').on('input', function (e) {
        image.imageOpacity = parseFloat(e.target.value);
        console.log('设置透明度:', image.imageOpacity);

        if (opacityTimeout) clearTimeout(opacityTimeout);
        opacityTimeout = setTimeout(function () {
            saveState();
            drawImage();
        }, 100);
    });

    // 文字相关功能
    $('#add-text').click(function () {
        image.isAddingText = true;
        image.textInput = $('#text-input').val();

        if (!image.textInput) {
            alert('请输入要添加的文字');
            return;
        }

        image.textPos = { x: 0, y: 0 };

        console.log('添加文字:', image.textInput);
        saveState();
        drawImage();
    });

    $('#text-color').change(function (e) {
        image.textColor = e.target.value;
        console.log('设置文字颜色:', image.textColor);
        saveState();
        drawImage();
    });

    $('#text-font').change(function (e) {
        image.textFont = e.target.value;
        console.log('设置文字字体:', image.textFont);
        saveState();
        drawImage();
    });

    $('#text-size').change(function (e) {
        image.textSize = parseInt(e.target.value);
        console.log('设置文字大小:', image.textSize);
        saveState();
        drawImage();
    });

    // 保存当前状态
    function saveState() {
        // 创建一个临时canvas来保存当前图片状态
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.img.width;
        tempCanvas.height = image.img.height;
        var tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(image.img, 0, 0);
        var imgDataURL = tempCanvas.toDataURL();

        var state = {
            img: imgDataURL,
            originalImg: image.originalImg ? image.originalImg.src : null,
            scale: image.scale,
            rotation: image.rotation,
            imgX: image.imgX,
            imgY: image.imgY,
            textInput: image.textInput,
            textPos: JSON.parse(JSON.stringify(image.textPos)),
            textSize: image.textSize,
            textColor: image.textColor,
            textFont: image.textFont,
            isAddingText: image.isAddingText,
            imageOpacity: image.imageOpacity,
            currentFilter: image.currentFilter,
            brightness: image.brightness,
            contrast: image.contrast,
            saturation: image.saturation,
            blur: image.blur,
            bgColor: image.bgColor,
            currentBorder: image.currentBorder ? JSON.parse(JSON.stringify(image.currentBorder)) : null,
            watermarkImage: image.watermarkImage ? image.watermarkImage.src : null,
            watermarkPos: JSON.parse(JSON.stringify(image.watermarkPos))
        };

        // 如果当前不是历史记录的末尾，则丢弃后面的状态
        if (image.historyIndex < image.history.length - 1) {
            image.history = image.history.slice(0, image.historyIndex + 1);
        }

        // 限制历史记录数量
        if (image.history.length >= MAX_HISTORY) {
            image.history.shift();//移掉数组的首项
            image.historyIndex--;
        }

        image.history.push(state);
        image.historyIndex++;
        console.log('历史记录数量:', image.history.length, '当前索引:', image.historyIndex);

        updateUndoRedoButtons();
    }

    // 更新撤销/重做按钮状态
    function updateUndoRedoButtons() {
        $('#undo').prop('disabled', image.historyIndex < 0);
        $('#redo').prop('disabled', image.historyIndex <0);
    }

    // 撤销操作
    $('#undo').click(function () {
        if (image.historyIndex > 0) {
            image.historyIndex--;
            applyState(image.history[image.historyIndex]);
            console.log('撤销到状态', image.historyIndex);
            updateUndoRedoButtons();
        } else {
            console.log('已经是最初状态，无法撤销');
        }
    });

    // 重做操作
    $('#redo').click(function () {
        if (image.historyIndex >0) {
            image.historyIndex=0;
            applyState(image.history[0]);
            console.log('重做到状态', image.historyIndex);
            updateUndoRedoButtons();
        } else {
            console.log('已经是最新状态，无法重做');
        }
    });



    function applyState(state) {
        console.log('应用保存的状态');

        // 加载主图片
        const img = new Image();
        img.onload = () => {
            image.img = img;

            // 只有当需要恢复原始图片时才加载
            const shouldLoadOriginal = !image.originalImg || state.originalImg;
            if (!shouldLoadOriginal) {
                restoreAndDraw();
                return;
            }

            // 加载原始图片
            const originalImg = new Image();
            originalImg.onload = () => {
                image.originalImg = originalImg;
                restoreAndDraw();
            };
            originalImg.src = state.originalImg || state.img;
        };
        img.src = state.img;

        // 封装重复的操作
        function restoreAndDraw() {
            restoreImageProperties(state);
            drawImage();
        }
    }

    // 恢复图片属性
    function restoreImageProperties(state) {
        image.scale = state.scale;
        image.rotation = state.rotation;
        image.imgX = state.imgX;
        image.imgY = state.imgY;
        image.textInput = state.textInput;
        image.textPos = state.textPos;
        image.textSize = state.textSize;
        image.textColor = state.textColor;
        image.textFont = state.textFont;
        image.isAddingText = state.isAddingText;
        image.imageOpacity = state.imageOpacity;
        image.currentFilter = state.currentFilter;
        image.brightness = state.brightness;
        image.contrast = state.contrast;
        image.saturation = state.saturation;
        image.blur = state.blur;
        image.bgColor = state.bgColor;
        image.currentBorder = state.currentBorder;
        image.watermarkPos = state.watermarkPos;

        // 恢复水印图片
        if (state.watermarkImage) {
            var watermark = new Image();
            watermark.onload = function () {
                image.watermarkImage = watermark;
            };
            watermark.src = state.watermarkImage;
        } else {
            image.watermarkImage = null;
        }

        updateUIFromImage();
    }

    // 添加边框功能
    $('#add-border').click(function () {
        console.log('用户点击添加边框...');

        var borderColor = prompt("请输入边框颜色（例如 #FF0000 红色）:", "#000000");
        if (!borderColor) {
            console.log('用户取消了颜色输入');
            return;
        }

        var borderWidth = prompt("请输入边框宽度（像素）:", "10");
        if (!borderWidth) {
            console.log('用户取消了宽度输入');
            return;
        }

        borderWidth = parseInt(borderWidth);
        if (isNaN(borderWidth)) {
            alert('请输入有效的数字！');
            return;
        }

        image.currentBorder = {
            color: borderColor,
            width: borderWidth
        };

        saveState();
        drawImage();
        console.log('边框设置完成:', image.currentBorder);
    });

    //滤镜控制
    $('#filter').change(function (e) {
        image.currentFilter = e.target.value;
        console.log('设置滤镜:', image.currentFilter);

        // 隐藏所有滤镜滑块
        $('.filter-control').removeClass('visible');

        // 根据选择的滤镜显示相应的滑块
        switch (image.currentFilter) {
            case 'brightness':
                $('.filter-control:has(#brightness-slider)').addClass('visible');
                break;
            case 'contrast':
                $('.filter-control:has(#contrast-slider)').addClass('visible');
                break;
            case 'saturate':
                $('.filter-control:has(#saturation-slider)').addClass('visible');
                break;
            case 'blur':
                $('.filter-control:has(#blur-slider)').addClass('visible');
                break;
            case 'none':
            default:
                // 无滤镜时不显示任何滑块
                break;
        }

        // 显示/隐藏整个滤镜控制区域
        if (image.currentFilter !== 'none') {
            $('#filter-controls').addClass('visible');
        } else {
            $('#filter-controls').removeClass('visible');
        }

        saveState();
        drawImage();
    });

    // 滤镜参数控制
    var filterTimeout = null;
    function handleFilterChange() {
        if (filterTimeout) clearTimeout(filterTimeout);
        filterTimeout = setTimeout(function () {
            saveState();
            drawImage();
        }, 100);
    }

    $('#brightness-slider').on('input', function (e) {
        image.brightness = parseInt(e.target.value);
        console.log('设置亮度:', image.brightness);
        handleFilterChange();
    });

    $('#contrast-slider').on('input', function (e) {
        image.contrast = parseInt(e.target.value);
        console.log('设置对比度:', image.contrast);
        handleFilterChange();
    });

    $('#saturation-slider').on('input', function (e) {
        image.saturation = parseInt(e.target.value);
        console.log('设置饱和度:', image.saturation);
        handleFilterChange();
    });

    $('#blur-slider').on('input', function (e) {
        image.blur = parseInt(e.target.value);
        console.log('设置模糊:', image.blur);
        handleFilterChange();
    });

    // 主绘制函数
    function drawImage() {
        console.log('开始绘制...');
        var startTime = performance.now();

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = image.bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!image || !image.img) {
            console.log('没有图片可绘制');
            return;
        }

        ctx.globalAlpha = image.imageOpacity;
        ctx.save();

        ctx.translate(canvas.width / 2 + image.imgX, canvas.height / 2 + image.imgY);
        ctx.rotate(image.rotation * Math.PI / 180);
        ctx.scale(image.scale, image.scale);

        //绘制边框
        if (image.currentBorder && !isCropping) {
            console.log('绘制边框...');
            ctx.fillStyle = image.currentBorder.color;
            ctx.fillRect(
                -image.img.width / 2 - image.currentBorder.width,
                -image.img.height / 2 - image.currentBorder.width,
                image.img.width + image.currentBorder.width * 2,
                image.img.height + image.currentBorder.width * 2
            );
        }

        var filterStr = '';
        if (image.brightness !== 100) filterStr += `brightness(${image.brightness}%) `;
        if (image.contrast !== 100) filterStr += `contrast(${image.contrast}%) `;
        if (image.saturation !== 100) filterStr += `saturate(${image.saturation}%) `;
        if (image.blur > 0) filterStr += `blur(${image.blur}px) `;
        ctx.filter = filterStr.trim() || 'none';

        ctx.drawImage(
            image.img,
            -image.img.width / 2,
            -image.img.height / 2,
            image.img.width,
            image.img.height
        );

        // 绘制文字和水印
        if (!isCropping) {
            if (image.isAddingText && image.textInput) {
                console.log('绘制文字:', image.textInput);
                ctx.font = image.textSize + 'px ' + image.textFont;
                ctx.fillStyle = image.textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(image.textInput, image.textPos.x, image.textPos.y);
            }

            if (image.watermarkImage) {
                console.log('绘制水印');
                ctx.globalAlpha = 0.5;
                ctx.drawImage(
                    image.watermarkImage,
                    image.watermarkPos.x - image.watermarkImage.width / 2,
                    image.watermarkPos.y - image.watermarkImage.height / 2,
                    image.watermarkImage.width,
                    image.watermarkImage.height
                );
            }
        }

        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.filter = 'none';

        applyPixelFilters();

        if (isCropping && cropStartX && cropEndX) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();

            var x = Math.min(cropStartX, cropEndX);
            var y = Math.min(cropStartY, cropEndY);
            var width = Math.abs(cropEndX - cropStartX);
            var height = Math.abs(cropEndY - cropStartY);

            ctx.rect(x, y, width, height);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        var endTime = performance.now();
        console.log(`绘制完成，耗时 ${(endTime - startTime).toFixed(2)}ms`);
    }

    // 像素级滤镜处理
    function applyPixelFilters() {
        if (image.currentFilter === 'none') {
            return;
        }

        // 获取已经应用了CSS滤镜的图像数据
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;

        for (var i = 0; i < data.length; i += 4) {
            // 保存原始RGBA值
            var r = data[i];
            var g = data[i + 1];
            var b = data[i + 2];
            var a = data[i + 3];

            if (image.currentFilter === 'grayscale') {
                // 使用灰度转换公式
                var gray = 0.299 * r + 0.587 * g + 0.114 * b;
                data[i] = data[i + 1] = data[i + 2] = gray;
            }

            if (image.currentFilter === 'invert') {
                // 反转颜色
                data[i] = 255 - r;
                data[i + 1] = 255 - g;
                data[i + 2] = 255 - b;
            }

            if (image.currentFilter === 'sharpen') {
                // 锐化处理
                data[i] = Math.min(255, r * 1.5);
                data[i + 1] = Math.min(255, g * 1.5);
                data[i + 2] = Math.min(255, b * 1.5);
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    // 鼠标事件处理
    canvas.addEventListener('mousedown', function (e) {
        isDrawing = true;
        if (isCropping) {
            cropStartX = e.offsetX;
            cropStartY = e.offsetY;
            cropEndX = e.offsetX;
            cropEndY = e.offsetY;
            console.log('裁剪开始:', cropStartX, cropStartY);
        } else {
            var inImage = checkInImage(e.offsetX, e.offsetY);
            if (inImage) {
                if (image.textInput && checkInText(e.offsetX, e.offsetY)) {
                    isDraggingText = true;
                    lastMousePos = { x: e.offsetX, y: e.offsetY };
                    console.log('开始拖动文字');
                }
                else if (image.watermarkImage && checkInWatermark(e.offsetX, e.offsetY)) {
                    isDraggingWatermark = true;
                    lastMousePos = { x: e.offsetX, y: e.offsetY };
                    console.log('开始拖动水印');
                }
                else {
                    draggingImg = true;
                    console.log('开始拖动图片');
                }
            }
        }
    });

    canvas.addEventListener('mousemove', function (e) {
        if (!isDrawing) return;

        if (isCropping) {
            cropEndX = e.offsetX;
            cropEndY = e.offsetY;
            drawImage();
        } else if (draggingImg) {
            image.imgX += e.movementX;
            image.imgY += e.movementY;
            drawImage();
        } else if (isDraggingText) {
            var dx = (e.offsetX - lastMousePos.x) / image.scale;
            var dy = (e.offsetY - lastMousePos.y) / image.scale;

            image.textPos.x += dx;
            image.textPos.y += dy;

            lastMousePos = { x: e.offsetX, y: e.offsetY };
            drawImage();
        } else if (isDraggingWatermark) {
            var dx = (e.offsetX - lastMousePos.x) / image.scale;
            var dy = (e.offsetY - lastMousePos.y) / image.scale;

            image.watermarkPos.x += dx;
            image.watermarkPos.y += dy;

            lastMousePos = { x: e.offsetX, y: e.offsetY };
            drawImage();
        }
    });

    canvas.addEventListener('mouseup', function (e) {
        isDrawing = false;
        if (isCropping) {
            cropEndX = e.offsetX;
            cropEndY = e.offsetY;
            console.log('裁剪结束:', cropEndX, cropEndY);

            if (Math.abs(cropEndX - cropStartX) > 10 && Math.abs(cropEndY - cropStartY) > 10) {
                cropImage();
            } else {
                alert('请选择更大的裁剪区域');
            }
            isCropping = false;
        }

        if (draggingImg || isDraggingText || isDraggingWatermark) {
            saveState();
        }
        draggingImg = false;
        isDraggingText = false;
        isDraggingWatermark = false;
    });

    // 检查是否点击了图片区域
    function checkInImage(x, y) {
        if (!image || !image.img) return false;

        var centerX = canvas.width / 2 + image.imgX;
        var centerY = canvas.height / 2 + image.imgY;
        var halfW = image.img.width / 2 * image.scale;
        var halfH = image.img.height / 2 * image.scale;

        return x > centerX - halfW &&
            x < centerX + halfW &&
            y > centerY - halfH &&
            y < centerY + halfH;
    }

    // 检查是否点击了文字区域
    function checkInText(x, y) {
        ctx.save();

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(canvas.width / 2 + image.imgX, canvas.height / 2 + image.imgY);
        ctx.rotate(image.rotation * Math.PI / 180);
        ctx.scale(image.scale, image.scale);

        ctx.font = image.textSize + 'px ' + image.textFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        var textWidth = ctx.measureText(image.textInput).width;
        var textHeight = image.textSize;

        var textLeft = image.textPos.x - textWidth / 2;
        var textRight = image.textPos.x + textWidth / 2;
        var textTop = image.textPos.y - textHeight / 2;
        var textBottom = image.textPos.y + textHeight / 2;

        var mouseInImage = {
            x: (x - (canvas.width / 2 + image.imgX)) / image.scale,
            y: (y - (canvas.height / 2 + image.imgY)) / image.scale
        };

        var angle = -image.rotation * Math.PI / 180;
        var rotatedX = mouseInImage.x * Math.cos(angle) - mouseInImage.y * Math.sin(angle);
        var rotatedY = mouseInImage.x * Math.sin(angle) + mouseInImage.y * Math.cos(angle);

        ctx.restore();

        return rotatedX >= textLeft && rotatedX <= textRight &&
            rotatedY >= textTop && rotatedY <= textBottom;
    }

    // 检查是否点击了水印区域
    function checkInWatermark(x, y) {
        if (!image.watermarkImage) return false;

        ctx.save();

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(canvas.width / 2 + image.imgX, canvas.height / 2 + image.imgY);
        ctx.rotate(image.rotation * Math.PI / 180);
        ctx.scale(image.scale, image.scale);

        var watermarkLeft = image.watermarkPos.x - image.watermarkImage.width / 2;
        var watermarkRight = image.watermarkPos.x + image.watermarkImage.width / 2;
        var watermarkTop = image.watermarkPos.y - image.watermarkImage.height / 2;
        var watermarkBottom = image.watermarkPos.y + image.watermarkImage.height / 2;

        var mouseInImage = {
            x: (x - (canvas.width / 2 + image.imgX)) / image.scale,
            y: (y - (canvas.height / 2 + image.imgY)) / image.scale
        };

        var angle = -image.rotation * Math.PI / 180;
        var rotatedX = mouseInImage.x * Math.cos(angle) - mouseInImage.y * Math.sin(angle);
        var rotatedY = mouseInImage.x * Math.sin(angle) + mouseInImage.y * Math.cos(angle);

        ctx.restore();

        return rotatedX >= watermarkLeft && rotatedX <= watermarkRight &&
            rotatedY >= watermarkTop && rotatedY <= watermarkBottom;
    }

    // 裁剪功能
    $('#crop').click(function () {
        isCropping = true;
        console.log('进入裁剪模式');
        alert('请在图片上拖动鼠标选择裁剪区域');
    });
    function cropImage() {
        var width = Math.abs(cropEndX - cropStartX);
        var height = Math.abs(cropEndY - cropStartY);
        var x = Math.min(cropStartX, cropEndX);
        var y = Math.min(cropStartY, cropEndY);

        console.log('执行裁剪:', x, y, width, height);

        // 创建一个临时画布用于裁剪
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        var tempCtx = tempCanvas.getContext('2d');

        // 只绘制原始图片（不包含文字、水印等）
        tempCtx.save();
        tempCtx.drawImage(
            image.img,
            x - (canvas.width / 2 + image.imgX - image.img.width / 2 * image.scale),
            y - (canvas.height / 2 + image.imgY - image.img.height / 2 * image.scale),
            width / image.scale,
            height / image.scale,
            0,
            0,
            width,
            height
        );
        tempCtx.restore();

        var croppedImage = new Image();
        croppedImage.onload = function () {
            // 更新图片对象（保留其他属性）
            var oldImg = image.img;
            image.img = croppedImage;
            image.originalImg = croppedImage;

            // 重置位置和缩放
            image.imgX = 0;
            image.imgY = 0;
            image.scale = 1;
            image.rotation = 0;

            // 保留文字内容但重置位置
            image.textPos = { x: 0, y: 0 };

            // 保存状态并重绘
            saveState();
            drawImage();
        };
        croppedImage.src = tempCanvas.toDataURL();
    }

    // 背景颜色设置
    $('#bg-color').change(function (e) {
        image.bgColor = e.target.value;
        console.log('设置背景颜色:', image.bgColor);
        saveState();
        drawImage();
    });

    // 镜像功能
    $('#mirror-horizontal').click(function () {
        console.log('水平镜像');

        // 保存当前状态到历史记录
        saveState();

        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.img.width;
        tempCanvas.height = image.img.height;
        var tempCtx = tempCanvas.getContext('2d');

        tempCtx.translate(image.img.width, 0);
        tempCtx.scale(-1, 1);
        tempCtx.drawImage(image.img, 0, 0);

        var mirroredImage = new Image();
        mirroredImage.onload = function () {
            image.img = mirroredImage;
            saveState();
            drawImage();
        };
        mirroredImage.src = tempCanvas.toDataURL();
    });

    $('#mirror-vertical').click(function () {
        console.log('垂直镜像');

        // 保存当前状态到历史记录
        saveState();

        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.img.width;
        tempCanvas.height = image.img.height;
        var tempCtx = tempCanvas.getContext('2d');

        tempCtx.translate(0, image.img.height);
        tempCtx.scale(1, -1);
        tempCtx.drawImage(image.img, 0, 0);

        var mirroredImage = new Image();
        mirroredImage.onload = function () {
            image.img = mirroredImage;
            saveState();
            drawImage();
        };
        mirroredImage.src = tempCanvas.toDataURL();
    });

    // 水印功能
    $('#add-watermark').click(function () {
        console.log('添加水印');
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.click();

        input.addEventListener('change', function (e) {
            var file = e.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function (ev) {
                var watermark = new Image();
                watermark.src = ev.target.result;
                watermark.onload = function () {
                    var maxWidth = 100;
                    var maxHeight = 100;
                    var ratio = Math.min(maxWidth / watermark.width, maxHeight / watermark.height);
                    watermark.width = watermark.width * ratio;
                    watermark.height = watermark.height * ratio;

                    image.watermarkPos = { x: 0, y: 0 };
                    image.watermarkImage = watermark;
                    saveState();
                    drawImage();
                };
            };
            reader.readAsDataURL(file);

            document.body.removeChild(input);
        });
    });

    // 图片信息显示
    $('#show-image-info').click(function () {
        var info = $('#image-info');

        if (image && image.img) {
            // 改进的格式检测（仅从 data URL 提取）
            var format = '未知格式';

            if (image.img.src.startsWith('data:image/')) {
                // 示例: "data:image/jpeg;base64,..." → "JPEG"
                format = image.img.src.split(';')[0].split('/')[1].toUpperCase();
            }

            $('.info-content').html(`
            <div class="info-row">
                <span class="info-label">宽度:</span>
                <span class="info-value">${image.img.width}px</span>
            </div>
            <div class="info-row">
                <span class="info-label">高度:</span>
                <span class="info-value">${image.img.height}px</span>
            </div>
            <div class="info-row">
                <span class="info-label">格式:</span>
                <span class="info-value">${format}</span>
            </div>
            <div class="info-row">
                <span class="info-label">缩放:</span>
                <span class="info-value">${Math.round(image.scale * 100)}%</span>
            </div>
            <div class="info-row">
                <span class="info-label">旋转:</span>
                <span class="info-value">${image.rotation}°</span>
            </div>
            ${image.currentBorder ? `
            <div class="info-row">
                <span class="info-label">边框:</span>
                <span class="info-value">${image.currentBorder.width}px ${image.currentBorder.color}</span>
            </div>` : ''}
            ${image.watermarkImage ? `
            <div class="info-row">
                <span class="info-label">水印:</span>
                <span class="info-value">已添加 (${image.watermarkImage.width}x${image.watermarkImage.height})</span>
            </div>` : ''}
        `);
        } else {
            $('.info-content').html('<p class="no-image">没有加载图片</p>');
        }
        info.show();
    });
    // 为图片信息弹窗的关闭按钮添加点击事件
    $('.close-btn').click(function () {
        $('#image-info').hide();
    });

    //下载图片
    $('#download').click(function () {
        if (!image || !image.img) {
            alert('请先加载图片');
            return;
        }

        // 1. 计算图片内容在画布中的实际显示区域
        var imgDisplayWidth = image.img.width * image.scale;
        var imgDisplayHeight = image.img.height * image.scale;

        // 如果有边框，增加边框尺寸
        if (image.currentBorder) {
            imgDisplayWidth += image.currentBorder.width * 2 * image.scale;
            imgDisplayHeight += image.currentBorder.width * 2 * image.scale;
        }

        // 2. 计算内容区域在画布中的位置（考虑旋转和位移）
        var centerX = canvas.width / 2 + image.imgX;
        var centerY = canvas.height / 2 + image.imgY;

        // 裁剪区域的起点和宽高
        var cropX = centerX - imgDisplayWidth / 2;
        var cropY = centerY - imgDisplayHeight / 2;
        var cropWidth = imgDisplayWidth;
        var cropHeight = imgDisplayHeight;

        // 3. 创建临时画布（仅包含内容区域）
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropWidth;
        tempCanvas.height = cropHeight;
        var tempCtx = tempCanvas.getContext('2d');

        // 4. 从主画布复制内容区域
        tempCtx.drawImage(
            canvas, // 直接使用主画布
            cropX, cropY, cropWidth, cropHeight, // 源区域
            0, 0, cropWidth, cropHeight          // 目标区域
        );

        // 5. 获取用户选择的格式
        var format = $('#save-format').val();
        var mimeType, fileExtension, quality;

        if (format === 'jpeg') {
            mimeType = 'image/jpeg';
            fileExtension = 'jpg';
            quality = 0.92; // 默认JPEG质量为92%

        } else {
            // 默认PNG格式
            mimeType = 'image/png';
            fileExtension = 'png';
            quality = undefined; // PNG不需要质量参数
        }

        // 6. 触发下载
        var link = document.createElement('a');
        link.download = 'edited-image.' + fileExtension;
        link.href = tempCanvas.toDataURL(mimeType, quality ? { quality: quality } : undefined);
        link.click();
    });

    // 错误处理
    window.onerror = function (msg, url, line) {
        console.error('发生错误:', msg, '在', url, '第', line, '行');
        alert('抱歉，发生了一个错误: ' + msg);
    };

    console.log('图片编辑器初始化完成，准备就绪！');
});