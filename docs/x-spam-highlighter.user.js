// ==UserScript==
// @name        X Spam Highlighter
// @namespace   https://github.com/shapoco/x-spam-highlighter/
// @match       https://x.com/*
// @grant       none
// @version     1.0.3
// @author      Shapoco
// @description フォロワー覧でスパムっぽいアカウントを強調表示します
// @supportURL  https://github.com/shapoco/x-spam-highlighter/
// @homepageURL https://github.com/shapoco/x-spam-highlighter/
// @updateURL   https://shapoco.github.io/x-spam-highlighter/x-spam-highlighter.user.js
// @downloadURL https://shapoco.github.io/x-spam-highlighter/x-spam-highlighter.user.js
// ==/UserScript==

const PROCESS_INTERVAL_MS = 300;
const KEYWORD_BACKGROUND_COLOR = 'rgba(255, 255, 0, 0.25)';

const followButtonDataIdRegex = /(\d+)-(un)?(follow|block)/;

// 評価ルール
const rules = [
//{ regexes:[/あ/g], penalty:100}, // テスト用
  { regexes:[/お金|現金|\d*万円/g, /配布|配り|配る|配っ[てた]?|プレゼント|分配/g], penalty:50},
  { regexes:[/貧乏|底辺/g, /成り上がり/g], penalty:50},
  { regexes:[/気にな(って)?る[男女]性/g], penalty:50},
  { regexes:[/底辺/g], penalty:20},
  { regexes:[/FIRE/g], penalty:20},
  { regexes:[/LINE/g], penalty:20},
  { regexes:[/オナニー|自慰/g], penalty:20},
  { regexes:[/まんこ|クリトリス|アナル|ペニス|ちんちん|ちんこ/g], penalty:20},
  { regexes:[/エロい?|Hな|えっ?ち[いぃ]/g], penalty:20},
  { regexes:[/エッチ|セックス|夜の営み/g], penalty:20},
  { regexes:[/ヤリたい/g], penalty:20},
  { regexes:[/フォロバ/g, /100[%％]?/g], penalty:10},
  { regexes:[/出会(い|える)?/g], penalty:10},
  { regexes:[/快楽/g], penalty:10},
  { regexes:[/サロン/g], penalty:10},
  { regexes:[/(裏|ウラ)(垢|アカ)/g], penalty:10},
  { regexes:[/\bDM\b|チャット|トーク/g], penalty:5},
  { regexes:[/過激な?/g], penalty:5},
  { regexes:[/投資|為替|\bFX\b/g], penalty:5},
  { regexes:[/社長/g], penalty:5},
].map(rule => {
  rule.regexes = rule.regexes.map(regex => {
    const tmp = regex.toString();
    return new RegExp(toHiragana(tmp.substring(1, tmp.length - 2)), 'g');
  });
  return rule;
});

// 検索避け文字
const searchObstCharRegex = /[ /\\.\|]/g;
const searchObstCharRegexStr = (function(){
  const tmp = searchObstCharRegex.toString();
  return tmp.substring(1, tmp.length - 2);
})();

var lastLocation = null;
var followButtons = [];
var followerListRoot = null;
var finishedElems = [];

setTimeout(scanUsers, PROCESS_INTERVAL_MS);

function scanUsers() {
  const currLocation = window.location.href;
  if (currLocation != lastLocation) {
    // ページ遷移したらリセット
    followButtons = [];
    followerListRoot = null;
    finishedElems = [];
    lastLocation = currLocation;
  }

  if (currLocation.match(/^https:\/\/(twitter|x)\.com\/\w+\/\w*followers/)) {
    // フォロワー一覧でのみ処理を実行する
    scanUsersInner();
    setTimeout(scanUsers, PROCESS_INTERVAL_MS);
  }
  else {
    setTimeout(scanUsers, 1000);
  }
}

function scanUsersInner() {
  // フォローボタンを探す
  const newFollowButtons =
        Array.from(document.querySelectorAll('button'))
        .filter(isFollowButton);
  followButtons = followButtons.concat(newFollowButtons);
  if (followButtons.length < 2) return;

  // フォローボタンの共通の親要素を探す
  if (!followerListRoot) {
    followerListRoot = findCommonParent(followButtons[0], followButtons[1]);
    if (!followerListRoot) {
      console.error('Root element not found.');
    }
  }
  if (!followerListRoot) return;

  Array.from(followerListRoot.children).forEach(processUser);
}

// 要素がフォローボタンかどうかを返す
function isFollowButton(btn) {
  // フォローボタンでないものは除外
  if (!btn.dataset.testid) return false;
  if (!btn.dataset.testid.match(followButtonDataIdRegex)) return false;

  // 既知のボタンは除外
  if (btn in followButtons) return false;

  // ビューポートの端にある要素は除外
  const vw = window.innerWidth;
  const rect = btn.getBoundingClientRect();
  if (rect.right < vw / 2 || vw * 3 / 4 < rect.left) return false;

  return true;
}

// 要素 a と b の共通の親要素を返す
function findCommonParent(a, b) {
  var parents = [];
  while (a.parentElement) {
    parents.push(a.parentElement);
    a = a.parentElement;
  }
  while (b.parentElement) {
    if (parents.includes(b.parentElement)) {
      return b.parentElement;
    }
    b = b.parentElement;
  }
  return null;
}

// ユーザ毎の処理
function processUser(elm) {
  // 処理済みの要素は除く
  if (finishedElems.includes(elm)) return;
  finishedElems.push(elm);

  const text = normalizeForHitTest(elm.textContent);

  // 評価
  var wordsToBeHighlighted = [];
  var penalty = 0;
  rules.forEach(rule => {
    var allMatched = true;
    var matchedWords = [];

    // ルールに定義された全ての正規表現にマッチするか確認する
    rule.regexes.forEach(regex => {
      const matches = text.match(regex);
      if (matches) {
        matches.forEach(m => {
          if (!wordsToBeHighlighted.includes(m) && !matchedWords.includes(m)) {
            matchedWords.push(m);
          }
        });
      }
      else {
        allMatched = false;
      }
    });

    if (allMatched) {
      // 全てにマッチしたらスコアを加算
      penalty += rule.penalty;
      wordsToBeHighlighted = wordsToBeHighlighted.concat(matchedWords);
    }
  });

  // キーワードハイライト
  wordsToBeHighlighted.forEach(kwd => {
    highlightKeyword(elm, kwd);
  });

  if (penalty < 10) return;

  // ユーザのハイライト
  const MAX_ALPHA = 0.5;
  const alpha = Math.max(0, Math.min(MAX_ALPHA, penalty / 100));
  elm.style.backgroundColor = `rgba(255, 0, 0, ${alpha})`;
}

function highlightKeyword(elm, kwd) {
  const children = Array.from(elm.childNodes);
  children.forEach(child => {
    if (child instanceof Text) {
      // テキスト要素
      const childText = child.nodeValue;
      if (normalizeForHitTest(childText).includes(kwd)) {
        const span = document.createElement('span');
        span.innerHTML = replaceTextContent(childText, kwd);
        const frag = document.createDocumentFragment();
        frag.appendChild(span);
        child.parentNode.replaceChild(frag, child);
      }
    }
    else {
      // テキスト要素以外
      const childText = child.textContent;
      if (normalizeForHitTest(childText).includes(kwd)) {
        if (childText == child.innerHTML) {
          child.innerHTML = replaceTextContent(childText, kwd);
        }
        else {
          highlightKeyword(child, kwd);
        }
      }
    }
  });
}

function replaceTextContent(text, kwd) {
  // 検索用に正規化
  const normText = normalizeForReplace(text);

  // 検索避け文字を考慮して検索用正規表現作成
  const kwdChars = kwd.split('').map(c => c.replaceAll(/([\*\+\.\?\{\}\(\)\[\]\^\$\-\|\/])/g, '\\$1'));
  const kwdRegex = new RegExp(`(${kwdChars.join(searchObstCharRegexStr + '?')})`, 'dg');

  // 検索用文字列で文字位置を検出して、置換はオリジナルの文字列を使って行う
  var html = '';
  var end = 0;
  var m;
  while (!!(m = kwdRegex.exec(normText))) {
    const start = kwdRegex.lastIndex - m[0].length;
    html += text.substring(end, start);
    end = kwdRegex.lastIndex;
    html += `<span style="background-color: ${KEYWORD_BACKGROUND_COLOR};">${text.substring(start, end)}</span>`;
  }
  html += text.substring(end);
  return html;
}

function normalizeForReplace(orig) {
  var ret = toNarrow(toHiragana(orig))
    .replaceAll(/[―─]/g, 'ー');
  console.assert(orig.length == ret.length);
  return ret;
}

function normalizeForHitTest(orig) {
  return normalizeForReplace(orig).replaceAll(searchObstCharRegex, '');
}

function toHiragana(orig) {
  const ret = orig.replaceAll(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));
  console.assert(orig.length == ret.length);
  return ret;
}

function toNarrow(orig) {
  const ret = orig.replaceAll(/[Ａ-Ｚａ-ｚ０-９]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xFEE0));
  console.assert(orig.length == ret.length);
  return ret;
}

