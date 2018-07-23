'use strict';

// функция отправки файла на сервер через inputFile или Drag'n'Drop

function sendFile(file) {
    console.log(`Запущена функция sendFile()`);
    errorWrap.classList.add('hidden');
    const imageTypeRegExp = /^image\/jpg|jpeg|png/;
    if (imageTypeRegExp.test(file.type)) {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('title', file.name);
        formData.append('image', file);
        xhr.open('POST', 'https://neto-api.herokuapp.com/pic/');
        xhr.addEventListener("loadstart", () => imgLoader.style.display = 'block');
        xhr.addEventListener("loadend", () => imgLoader.style.display = 'none');
        xhr.addEventListener('load', () => {
            if(xhr.status === 200) {
            if(connection) {
                connection.close(1000, 'Работа закончена');
            }
            const result = JSON.parse(xhr.responseText);
            img.src = result.url;
            mask.src = '';
            imgID = result.id;
            url.value = `${location.origin + location.pathname}?${imgID}`;
            menu.dataset.state = 'selected';
            share.dataset.state = 'selected';

            console.log(`Изображение опубликовано! Дата публикации: ${timeParser(result.timestamp)}`);

            clearForms();
            getWSConnect();

        } else {
            errorWrap.classList.remove('hidden');
            errorMessage.innerText = `Произошла ошибка ${xhr.status}! ${xhr.statusText}... Повторите попытку позже... `;
        }
    })
        xhr.send(formData);
    } else {
        errorWrap.classList.remove('hidden');
        errorMessage.innerText = 'Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.';
    }
}

// открытие WebSocket соединения

function getWSConnect() {
    console.log(`Запущена функция getWSConnect()`);
    connection = new WebSocket(`wss://neto-api.herokuapp.com/pic/${imgID}`);
    connection.addEventListener('open', () => console.log('Connection open...'));
    connection.addEventListener('message', event => sendMask(JSON.parse(event.data)));
    connection.addEventListener('close', event => console.log('Вебсокет-соединение закрыто'));
    connection.addEventListener('error', error => {
        errorWrap.classList.remove('hidden');
        errorMessage.innerText = `Произошла ошибка ${error.data}! Повторите попытку позже... `;
    });
}

// открытие страницы по ссылке

if (location.search) {
    console.log(`Перехожу по ссылке ${`\`${location.origin + location.pathname}?${imgID}\``}`);
    getShareData((location.search).replace(/^\?/, ''));
}

// функция запроса информации по ID через ссылку

function getShareData(id) {
    console.log(`Запущена функция getShareData()`);
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `https://neto-api.herokuapp.com/pic/${id}`);
    xhr.addEventListener('load', () => {
        console.log(xhr.status)
    if (xhr.status === 200) {
        loadShareData(JSON.parse(xhr.responseText));
    } else {
        errorWrap.classList.remove('hidden');
        errorMessage.innerText = `Произошла ошибка ${xhr.status}! ${xhr.statusText}... Повторите попытку позже... `;
    }
})
    xhr.send();
}

// обработка данных запроса информации по ID через ссылку

function loadShareData(result) {
    console.log(`loadShareData() : Изображение получено! Дата публикации: ${timeParser(result.timestamp)}`);
    img.src = result.url;
    url.value = `${location.href}?${imgID}`;
    imgID = result.id;
    menu.dataset.state = 'selected';
    comments.dataset.state = 'selected';

    if (result.comments) {
        createCommentsArray(result.comments);
    }

    if (result.mask) {
        mask.src = result.mask;
        mask.classList.remove('hidden');
    }

    if (document.getElementById('comments-off').checked) {
        console.log('Комментарии выключены!');
        const commentsForm = document.querySelectorAll('.comments__form');
        for (const comment of commentsForm) {
            comment.classList.add('hidden');
        }
    }
    getWSConnect()
    closeAllForms();
}

// отправка коментария на сервер

function sendNewComment(id, comment, target) {
    console.log(`Запущена функция sendNewComment()`);
    const xhr = new XMLHttpRequest();
    const body = 'message=' + encodeURIComponent(comment.message) +
        '&left=' + comment.left +
        '&top=' + comment.top;
    xhr.open("POST", `https://neto-api.herokuapp.com/pic/${id}/comments`, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.addEventListener("loadstart", () => target.querySelector('.loader').classList.remove('hidden'));
    xhr.addEventListener("loadend", () => target.querySelector('.loader').classList.add('hidden'));
    xhr.addEventListener('load', () => {
        console.log(xhr.status)
    if(xhr.status === 200) {
        console.log('Комментарий был отправвлен!');
        const result = JSON.parse(xhr.responseText);
        createCommentsArray(result.comments);
        needReload = false;
    } else {
        errorWrap.classList.remove('hidden');
        errorMessage.innerText = `Произошла ошибка ${xhr.status}! ${xhr.statusText}... Повторите попытку позже... `;
    }
})
    xhr.send(body);
}

// отправка маски на сервер

function sendMask(response) {
    console.log(`Запущена функция sendMask()`);
    if (isDraw) {
        canvas.toBlob(blob => {
            currentCanvasSize = blob.size;
        if (currentCanvasSize !== emptyCanvasSize) {
            connection.send(blob);
        }
        console.log(`emptyCanvasSize = ${emptyCanvasSize}. currentCanvasSize = ${currentCanvasSize}. Режим рисования включен!`);
    })
        isDraw = false;
    } else {
        if (checkImageLoad()) {
            canvas.toBlob(blob => emptyCanvasSize = blob.size);
        }
        console.log(`emptyCanvasSize = ${emptyCanvasSize}. Режим рисования выключен!`);
    }

    if (response) {
        console.log(response);
        if (response.event === 'mask') {
            console.log('Событие mask...');
            mask.classList.remove('hidden');
            mask.src = response.url;
            clearCanvas();
        } else if (response.event === 'comment') {
            console.log('Событие comment...');
            pullComments(response);
        }
    }
}

// обарботка коментариев из данных запроса информации по ID через ссылку

function pullComments(result) {
    console.log(`Запущена функция pullComments()`);
    console.log(result);
    countComments = 0;

    const countCurrentComments = document.getElementsByClassName('comment').length - document.getElementsByClassName('comment load').length;
    needReload = (countComments === countCurrentComments) ? false : true;
    console.log(countComments, countCurrentComments);

    if (result) {
        createCommentForm([result.comment]);
    }

    if (document.getElementById('comments-off').checked) {
        const commentsForm = document.querySelectorAll('.comments__form');
        for (const comment of commentsForm) {
            comment.classList.add('hidden');
        }
    }
}
