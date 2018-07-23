'use strict';

const pageDimension = { width: document.body.clientWidth, height: document.body.clientHeight };
const fileInput = document.getElementById('fileInput');
const menu = document.querySelector('.menu');
const burger = document.querySelector('.burger');
const share = document.querySelector('.share');
const draw = document.querySelector('.draw');
const comments = document.querySelector('.comments');
const img = document.querySelector('.current-image');
const imgLoader = document.querySelector('.image-loader');
const errorWrap = document.querySelector('.error');
const errorMessage = document.querySelector('.error__message');
const url = document.querySelector('.menu__url');
const copyButton = document.querySelector('.menu_copy');
const menuToggle = document.querySelector('.menu__toggle-bg');
const mask = document.querySelector('.mask');
const shiftMenu = {x: 0, y: 0};
let emptyCanvasSize = 0;
let currentCanvasSize = 0;
let isDraw = false;
let needReload = false;
let imgID = null;
let movedPiece = null;
let bounds;
let connection;
let response;
let countComments;

document.addEventListener('click', () => errorWrap.classList.add('hidden'));
document.addEventListener('mousedown', clickToMove);
img.addEventListener('load', canvasSize);
menu.addEventListener('click', changeMode);
copyButton.addEventListener('click', copyURL);
fileInput.addEventListener('change', onSelectFiles);

// определение размера канваса и маски

function canvasSize() {
    console.log('Запущена функция canvasSize...');
    clearCanvas();
    if (checkImageLoad()) {
        canvas.removeAttribute('class');
        console.log('Изображение загрузилось. Меняю размер холста...');
        canvas.width = img.width;
        canvas.height = img.height;
    }
}

// определение размера маски

function maskSize() {
    console.log('Запущена функция maskSize...');
    clearCanvas();
    if (checkImageLoad()) {
        console.log('Изображение загрузилось. Меняю размер маски...');
        mask.width = img.width;
        mask.height = img.height;
    }
}

// функция для проверки окончательной загрузки изображения

function checkImageLoad() {
    console.log('Запущена функция checkImageLoad...');
    console.log(img.complete);
    console.log(img.naturalWidth);
    if (img.complete && img.naturalHeight !== 0){
        return true;
    } else {
        return false;
    }
}

function clickToMove(event) {
    if(event.target.classList.contains('drag')) {
        movedPiece = event.target.parentNode;
        bounds = event.target.getBoundingClientRect();
        shiftMenu.x = event.pageX - bounds.left - window.pageXOffset;
        shiftMenu.y = event.pageY - bounds.top - window.pageYOffset;
    }
}

// переключение режимов

function changeMode(event) {
    const element = event.target;
    const parent = event.target.parentNode;
    const currentMode = document.querySelector('.menu__item[data-state = selected]');

    if (element.tagName === 'LI' || parent.tagName === 'LI') {
        if(parent.classList.contains('burger') || element.classList.contains('burger')) {
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

// форматирование даты

function timeParser(miliseconds) {
    const date = new Date(miliseconds);
    const options = {day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'};
    const formatDate = new Intl.DateTimeFormat("ru-RU", options).format;
    return formatDate(date);
}

// выбор изображения

function onSelectFiles(event) {
    console.log(`Файл выбран. Функция onSelectFiles()`);
    const files = event.target.files;
    if (files[0]) {
        sendFile(files[0]);
    }
}

// функция копирования ссылки

function copyURL() {
    url.select();
    document.execCommand('copy');
    console.log(`Текст скопирован в буфер обмена...`);
}
