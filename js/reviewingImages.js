'use strict';

let connection, response, imgID = null;

if (location.search) {
    getShareData((location.search).replace(/^\?/, ''));
}

const imgLoader = document.querySelector('.image-loader');

document.body.addEventListener('drop', onFilesDrop);
document.body.addEventListener('dragover', event => event.preventDefault());

var needReload = false;
const pageDimension = { width: document.body.clientWidth, height: document.body.clientHeight }, shiftMenu = {x: 0, y: 0};
let bounds, movedPiece = null;

document.addEventListener('mousedown', clickToMove);
document.addEventListener('mousemove', dragStart, false);
document.addEventListener('mouseup', dragStop);

function clickToMove(event) {
    if(event.target.classList.contains('drag')) {
        movedPiece = event.target.parentNode;
        bounds = event.target.getBoundingClientRect();
        shiftMenu.x = event.pageX - bounds.left - window.pageXOffset;
        shiftMenu.y = event.pageY - bounds.top - window.pageYOffset;
    }
}

function dragStart(event) {
    if (movedPiece) {
        event.preventDefault();
        const cords = {x: event.pageX - shiftMenu.x, y: event.pageY - shiftMenu.y};
        const maxX = pageDimension.width - movedPiece.offsetWidth - 1;
        const maxY = pageDimension.height - movedPiece.offsetHeight - 1;
        cords.x = Math.min(cords.x, maxX);
        cords.y = Math.min(cords.y, maxY);
        cords.x = Math.max(cords.x, 0);
        cords.y = Math.max(cords.y, 0);
        movedPiece.style.left = `${cords.x}px`;
        movedPiece.style.top = `${cords.y}px`;
    }
}

function dragStop() {
    if (movedPiece) {
        movedPiece = null;
    }
}

const menu = document.querySelector('.menu');
menu.addEventListener('click', changeMode);
const burger = document.querySelector('.burger'), share = document.querySelector('.share'), draw = document.querySelector('.draw'), comments = document.querySelector('.comments'), img = document.querySelector('.current-image');
img.addEventListener('load', canvasSize);
const errorWrap = document.querySelector('.error');
document.addEventListener('click', () => errorWrap.classList.add('hidden'));
const errorMessage = document.querySelector('.error__message'), url = document.querySelector('.menu__url'), copyButton = document.querySelector('.menu_copy');
copyButton.addEventListener('click', copyURL);
const menuToggle = document.querySelector('.menu__toggle-bg');
menuToggle.addEventListener('click', toggleComments);

const mask = document.querySelector('.mask'), fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', onSelectFiles);

function getShareData(id) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://neto-api.herokuapp.com/pic/${id}`);
    xhr.addEventListener('load', () => {
        if (xhr.status === 200){
        const result = JSON.parse(xhr.responseText);
        img.src = result.url;
        url.value = `${location.href}?${imgID}`;
        canvas.removeAttribute('class');
        canvas.width = img.width;
        canvas.height = img.height;
        imgID = result.id;
        menu.dataset.state = 'selected';
        comments.dataset.state = 'selected';

        if (result.comments) {
            createCommentsArray(result.comments);
        }

        if (result.mask) {
            mask.width = img.width;
            mask.height = img.height;
            mask.src = result.mask;
            mask.classList.remove('hidden');
        }

        if (document.getElementById('comments-off').checked) {
            const commentsForm = document.querySelectorAll('.comments__form');
            for (const comment of commentsForm) {
                comment.classList.add('hidden');
            }
        }
        getConnect()
        canvasSize();
        closeAllForms();
    }
});
    xhr.send();
}

let isDraw = false;

function changeMode(event) {
    const element = event.target, parent = event.target.parentNode, currentMode = document.querySelector('li[data-state = selected]');

    if (element.tagName === 'LI' || parent.tagName === 'LI') {
        if(parent.classList.contains('burger') || element.classList.contains('burger')) {
            const isNewComment = document.getElementsByClassName('comments__form new')[0];
            currentMode.dataset.state = '';
            menu.dataset.state = 'default';
            removeEmptyComment();
            closeAllForms();
            sendMask(response);
        }
        if(parent.classList.contains('new') || element.classList.contains('new')) {
            clearCanvas();
            fileInput.click();
        }
        if(parent.classList.contains('comments') || element.classList.contains('comments')) {
            menu.dataset.state = 'selected';
            comments.dataset.state = 'selected';
        }
        if(parent.classList.contains('draw') || element.classList.contains('draw')) {
            isDraw = true;
            menu.dataset.state = 'selected';
            draw.dataset.state = 'selected';
        }
        if(parent.classList.contains('share') || element.classList.contains('share')) {
            menu.dataset.state = 'selected';
            share.dataset.state = 'selected';
        }
    }
}

let emptyCanvasSize = 0, currentCanvasSize = 0;

function sendMask(response) {

    if (isDraw) {
        canvas.toBlob(blob => {
            currentCanvasSize = blob.size;
            if (currentCanvasSize !== emptyCanvasSize) {
                connection.send(blob);
            }
        })
        isDraw = false;
    } else {
        setTimeout(function() {
            canvas.toBlob(blob => emptyCanvasSize = blob.size);
        }, 5000);
    }

    if (response) {
            if (response.event === 'mask') {
            mask.classList.remove('hidden');
            mask.src = response.url;
            clearCanvas();
        } else if (response.event === 'comment') {
            getData(imgID);
        }
    }
}

window.addEventListener('resize', canvasSize);
const canvas = document.querySelector('canvas'), ctx = canvas.getContext('2d');
let curves = [], color = {'red': '#ea5d56', 'yellow': '#f3d135', 'green': '#6cbe47', 'blue': '#53a7f5', 'purple': '#b36ade'}, drawing = false, needsRepaint = false;

const colorButtons = document.querySelector('.draw-tools');
colorButtons.addEventListener('click', colorSelect);
ctx.strokeStyle = color['red'];

function colorSelect(event) {
    if (event.target.name === 'color') {
        const currentColor = document.querySelector('.menu__color[checked]');
        currentColor.removeAttribute('checked');
        event.target.setAttribute('checked', '');
    }
}

function canvasSize() {
    clearCanvas();
    canvas.width = img.width;
    canvas.height = img.height;
    mask.width = img.width;
    mask.height = img.height;
}

function clearCanvas() {
    curves = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    needsRepaint = true;
}

function getColor() {
    const currentColor = document.querySelector('.menu__color[checked]').value;
    return color[currentColor];
}

function smoothCurveBetween (p1, p2) {
    const cp = p1.map((coord, idx) => (coord + p2[idx]) / 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle =  getColor();
    ctx.quadraticCurveTo(...p1, ...cp);
}

function smoothCurve(points) {
    ctx.beginPath();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.moveTo(...points[0]);

    for(let i = 1; i < points.length - 1; i++) {
        smoothCurveBetween(points[i], points[i + 1]);
    }
    ctx.stroke();
}

canvas.addEventListener("mousedown", event => {
    if (draw.dataset.state === 'selected') {
        const curve = [];
        drawing = true;
        curve.push([event.offsetX, event.offsetY]);
        curves.push(curve);
        needsRepaint = true;
    }
});

canvas.addEventListener("mouseup", () => {
    curves = [];
    drawing = false;
});

canvas.addEventListener("mouseleave", () => {
    curves = [];
    drawing = false;
});

canvas.addEventListener("mousemove", event => {
    if (drawing) {
        const point = [event.offsetX, event.offsetY]
        curves[curves.length - 1].push(point);
        needsRepaint = true;
    }
});

function repaint () {
    curves.forEach((curve) => smoothCurve(curve));
}

function tick () {
    if(needsRepaint) {
        repaint();
        needsRepaint = false;
    }
    window.requestAnimationFrame(tick);
}

tick();

canvas.addEventListener('dblclick', clearCanvas);

function copyURL() {
    url.select();
    document.execCommand('copy');
}

function onSelectFiles(event) {
    const files = event.target.files;
    sendFile(files[0]);
}

function getConnect() {
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${imgID}`);
    connection.addEventListener('open', () => console.log('Connection open...'));
    connection.addEventListener('message', event => sendMask(JSON.parse(event.data)));
}

function sendFile(file) {
    errorWrap.classList.add('hidden');
    if (file) {
        const imageTypeRegExp = /^image\/jpg|jpeg|png/;
        if (imageTypeRegExp.test(file.type)) {
            const formData = new FormData();
            formData.append('title', file.name);
            formData.append('image', file);
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'https://neto-api.herokuapp.com/pic/');
            xhr.addEventListener("loadstart", onLoadStart);
            xhr.addEventListener("loadend", onLoadEnd);
            xhr.addEventListener('load', () => {
                if(xhr.status === 200) {
                    const result = JSON.parse(xhr.responseText);
                    img.src = result.url;
                    imgID = result.id;
                    url.value = `${location.origin + location.pathname}?${imgID}`;
                    canvas.removeAttribute('class');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    menu.dataset.state = 'selected';
                    share.dataset.state = 'selected';

                    getFile(imgID);
                    clearForms();
                    getConnect();
                }
            })
            xhr.send(formData);
        } else {
            errorWrap.classList.remove('hidden');
            errorMessage.innerText = 'Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.';
        }
    }
}

function onLoadStart() {
    imgLoader.style.display = 'block';
}

function onLoadEnd() {
    imgLoader.style.display = 'none';
}

let dataStorage;

function getFile(id) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://neto-api.herokuapp.com/pic/${id}`);
    xhr.addEventListener('load', () => {
        if (xhr.status === 200){
        const result = JSON.parse(xhr.responseText);
        img.src = result.url;
        img.classList.remove('hidden');
        url.value = `${location.origin + location.pathname}?${imgID}`;
        canvas.removeAttribute('class');
        canvas.width = img.width;
        canvas.height = img.height;
        mask.width = img.width;
        mask.height = img.height;
        imgID = result.id;
        menu.dataset.state = 'selected';
        share.dataset.state = 'selected';

        if(result.comments) {
            createCommentsArray(result.comments);
        }
        canvasSize();
        closeAllForms();
    }
});
    xhr.send();
}

function getData(id) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://neto-api.herokuapp.com/pic/${id}`);
    xhr.addEventListener('load', () => {
        if (xhr.status === 200){
        const result = JSON.parse(xhr.responseText);
        if (!img.getAttribute('src')) {
            console.log('no src img')
            img.src = result.url;
            url.value = `${location.origin + location.pathname}?${imgID}`;
        }
        imgID = result.id;
        mask.width = img.width;
        mask.height = img.height;

        dataStorage = 0;
        for (const comment in result.comments) {
            dataStorage++;
        }
        const countComments = document.getElementsByClassName('comment').length - document.getElementsByClassName('comment load').length;
        needReload = (countComments === dataStorage) ? false : true;
        if(result.comments && needReload) {
            createCommentsArray(result.comments);
        }
        if (document.getElementById('comments-off').checked) {
            console.log('off');
            const commentsForm = document.querySelectorAll('.comments__form');
            for (const comment of commentsForm) {
                comment.classList.add('hidden');
            }
        }
    }
});
    xhr.send();
}

function onFilesDrop(event) {
    event.preventDefault();
    if (!img.getAttribute('src')) {
        const files = event.dataTransfer.files;
        sendFile(files[0]);
    } else {
        errorWrap.classList.remove('hidden');
        errorMessage.innerText = 'Чтобы загрузить новое изображение, пожалуйста воспользуйтесь пунктом "Загрузить новое" в меню.';
    }
}

function toggleComments(event) {
    const commentsForm = document.querySelectorAll('.comments__form'), commentsOn = document.getElementById('comments-on'), commentsOff = document.getElementById('comments-off');

    if (commentsOn.checked) {
        commentsOff.removeAttribute('checked');
        commentsOn.setAttribute('checked', '');
        for (const comment of commentsForm) {
            comment.classList.remove('hidden');
        }
        closeAllForms();
    } else {
        commentsOn.removeAttribute('checked');
        commentsOff.setAttribute('checked', '');

        for (const comment of commentsForm) {
            comment.classList.add('hidden');
        }
        if (document.querySelector('.comments__marker-checkbox') && !document.querySelector('.app').lastChild.querySelector('.comments__marker-checkbox[type]')){
            document.querySelector('.app').removeChild(document.querySelector('.app').lastChild);
        }
    }
}

function removeEmptyComment() {
    const isNewComment = document.getElementsByClassName('comments__form new')[0];
    if (isNewComment) {
        document.querySelector('.app').removeChild(isNewComment);
    }
}

function clearForms() {
    const forms = document.querySelectorAll('.comments__form');
    for (const form of forms) {
        document.querySelector('.app').removeChild(form);
    }
}

const commentPos = {x: 0, y: 0};

function createNewComment(event) {
    const isCommentsOn = document.getElementById('comments-on').checked;
    if (comments.dataset.state === 'selected' && isCommentsOn) {
        removeEmptyComment();

        const otherForms = document.querySelectorAll('.comments__body');
        for (const body of otherForms) {
            body.style.display = 'none';
        }

        const app = document.querySelector('.app'), form = document.createElement('div');
        form.className = 'comments__form new';

        const marker = document.createElement('span');
        marker.className = 'comments__marker';

        const commentsBody = document.createElement('div');
        commentsBody.className = 'comments__body';

        const createMessaege = document.createElement('div');
        createMessaege.className = 'comment';

        const loader = document.createElement('div');
        loader.className = 'loader hidden';

        const commentsInput = document.createElement('textarea');
        commentsInput.className = 'comments__input';
        commentsInput.setAttribute('type', 'text');
        commentsInput.setAttribute('placeholder', 'Напишите ответ...');

        const commentsClose = document.createElement('input');
        commentsClose.className = 'comments__close';
        commentsClose.type = 'button';
        commentsClose.value = 'Закрыть';

        const commentsSubmit = document.createElement('input');
        commentsSubmit.className = 'comments__submit';
        commentsSubmit.type = 'submit';
        commentsSubmit.value = 'Отправить';

        loader.appendChild(document.createElement('span'));
        loader.appendChild(document.createElement('span'));
        loader.appendChild(document.createElement('span'));
        loader.appendChild(document.createElement('span'));
        loader.appendChild(document.createElement('span'));
        createMessaege.appendChild(loader);
        commentsBody.appendChild(createMessaege);
        commentsBody.appendChild(commentsInput);
        commentsBody.appendChild(commentsClose);
        commentsBody.appendChild(commentsSubmit);

        form.style.left = event.pageX + 'px';
        form.style.top = event.pageY + 'px';

        commentPos.x = event.pageX;
        commentPos.y = event.pageY;

        form.appendChild(marker);
        form.appendChild(commentsBody);
        app.appendChild(form);
        commentsClose.addEventListener('click', removeEmptyComment);
        commentsBody.style.display = 'block';
    }
}

document.addEventListener('click', markerClick);
document.addEventListener('click', closeForm);

function closeForm(event) {
    if (event.target.className === 'comments__close') {
        event.target.parentNode.style.display = 'none';
    }
}

function closeAllForms() {
    const otherForms = document.querySelectorAll('.comments__body');
    for (const body of otherForms) {
        body.style.display = 'none';
    }
}

function markerClick(event) {
    const bodyForm = event.target.nextElementSibling;
    if (bodyForm) {
        if (event.target.className === 'comments__marker-checkbox') {
            removeEmptyComment();

            if (bodyForm.style.display === 'block') {
                closeAllForms();
                bodyForm.style.display = 'none';
            } else {
                closeAllForms();
                bodyForm.style.display = 'block';
            }
        }
    }
}

let commentArray = [];

function createCommentsArray(comments) {
    commentArray = [];
    for (const comment in comments) {
        commentArray.push(comments[comment]);
    }
    clearForms();
    createCommentForm(commentArray);
}

function createCommentForm(comments) {
    const app = document.querySelector('.app');

    for (let comment of comments) {
        closeAllForms();

        const form = document.createElement('div');
        form.className = 'comments__form';

        const marker = document.createElement('span');
        marker.className = 'comments__marker';

        const markerCheckbox = document.createElement('input');
        markerCheckbox.className = 'comments__marker-checkbox';
        markerCheckbox.type = 'checkbox';

        const commentsBody = document.createElement('div');
        commentsBody.className = 'comments__body';
        commentsBody.style.display = 'block';

        const commit = document.createElement('div');
        commit.className = 'comment';

        const time = document.createElement('p');
        time.className = 'comment__time';
        time.innerText = timeParser(comment.timestamp);

        const message = document.createElement('p');
        message.className = 'comment__message';
        message.innerText = comment.message;

        commit.appendChild(time);
        commit.appendChild(message);

        const current = document.querySelector(`.comments__form[style="left: ${comment.left}px; top: ${comment.top}px;"]`);

        if (!current) {
            commentsBody.appendChild(commit);
            form.style.left = comment.left + 'px';
            form.style.top = comment.top + 'px';
            app.appendChild(form);
        } else {
            console.log('Запуск функции appendComment...')
            appendComment(commit, current);
        }

        const createMessage = document.createElement('div');
        createMessage.className = 'comment load';

        const loader = document.createElement('div');
        loader.className = 'loader hidden';

        const commentsInput = document.createElement('textarea');
        commentsInput.className = 'comments__input';
        commentsInput.setAttribute('type', 'text');
        commentsInput.setAttribute('placeholder', 'Напишите ответ...');

        const commentsClose = document.createElement('input');
        commentsClose.className = 'comments__close';
        commentsClose.type = 'button';
        commentsClose.value = 'Закрыть';

        const commentsSubmit = document.createElement('input');
        commentsSubmit.className = 'comments__submit';
        commentsSubmit.type = 'submit';
        commentsSubmit.value = 'Отправить';

        loader.appendChild(document.createElement('span'));
        loader.appendChild(document.createElement('span'));
        loader.appendChild(document.createElement('span'));
        loader.appendChild(document.createElement('span'));
        loader.appendChild(document.createElement('span'));
        createMessage.appendChild(loader);
        commentsBody.appendChild(createMessage);
        commentsBody.appendChild(commentsInput);
        commentsBody.appendChild(commentsClose);
        commentsBody.appendChild(commentsSubmit);

        form.appendChild(marker);
        form.appendChild(markerCheckbox);
        form.appendChild(commentsBody);
    }
}

function appendComment(element, target) {
    const comments = target.querySelector('.comments__body').querySelectorAll('.comment');
    closeAllForms();
    if (target) {
        target.querySelector('.comments__body').insertBefore(element, target.querySelector('.load'));
        target.querySelector('.comments__body').style.display = 'block';
    }
    needReload = false;
}

canvas.addEventListener('click', createNewComment);

function timeParser(miliseconds) {
    const date = new Date(miliseconds), options = {day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'}, formatDate = new Intl.DateTimeFormat("ru-RU", options).format;
    return formatDate(date);
}

document.querySelector('.app').addEventListener('click', messageHandler);

function sendNewComment(id, comment, target) {
    const xhr = new XMLHttpRequest(), body = 'message=' + encodeURIComponent(comment.message) +
        '&left=' + comment.left +
        '&top=' + comment.top;
    xhr.open("POST", `https://neto-api.herokuapp.com/pic/${id}/comments`, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.addEventListener("loadstart", () => target.querySelector('.loader').classList.remove('hidden'));
    xhr.addEventListener("loadend", () => target.querySelector('.loader').classList.add('hidden'));
    xhr.addEventListener('load', () => {
        if(xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);
            clearForms();
            createCommentsArray(result.comments);
            needReload = false;
        }
    })
    xhr.send(body);
}

function messageHandler(event) {
    if (event.target.className === 'comments__submit') {
        const element = event.target.parentNode.querySelector('textarea'), form = event.target.parentNode.parentNode;
        event.preventDefault();
        
        if (element.value) {
            const comment = {'message': element.value, 'left': parseInt(form.style.left), 'top': parseInt(form.style.top)};
            needReload = true;
            sendNewComment(imgID, comment, form);
            element.value = '';
        }
    }
}