// ==UserScript==
// @name        X Spam Highlighter
// @namespace   https://github.com/shapoco/x-spam-highlighter/
// @match       https://x.com/*
// @grant       none
// @version     1.0.26
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

const REGEX_AGE = /\b[1-3]\d(歳|才|age|さい|↑|↓|[台代]([前後]半)?|中盤)|二十歳|はたち|アラ(サー|フォー|フィフ)/g;
const REGEX_LENGTH = /\b1[3-8]\d+(cm|㎝|センチ|│)/g;
const REGEX_BUST = /\b[A-Z](カップ|cup)/g;
const REGEX_REGION = /東京|都内|(千代田|中央|港|新宿|文京|台東|墨田|江東|品川|目黒|大田|世田谷|渋谷|中野|杉並|豊島|北|荒川|板橋|練馬|足立|葛飾|江戸川|23)区|地方/g;
const REGEX_MEDIA = /動画|写真?|録画/g;
const REGEX_CASTING = /垂れ流し|配信|発信/g;
const REGEX_LIVING_ALONE = /(ひとり|[1一]人)暮らし/g;
const REGEX_MARRIAGE_STATE = /独身|未婚|既婚/g;
const REGEX_LONELY = /(寂|さび)しい/g;
const REGEX_JOB = /元?(\bOL\b|キャバ嬢|風俗|フ[ウー]ゾク|看護師|カフェ店員|メンズ?エステ?|教[師諭])/g;
const REGEX_GRADE = /(\b[1-3]|[一二三])年生?|[高大]([一二三]|[1-3]\b)/g;
const REGEX_CLUB = /(水泳|演劇|卓球|バレー|吹奏楽)部/g;
const REGEX_SEXUAL_DESIRE = /(性|せ[ーいぃ])(欲|[よょ]く)|欲求不満/g;
const REGEX_FREE = /無料|無償|フリー/g;

// 評価ルール
const rules = [
//{ regexes:[/あ/g], add:100}, // テスト用
  { regexes:[/お金|現金|\d*万円/g, /配布|配り|配る|配っ[てた]?|プレゼント|分配|給付/g], add:50},
  { regexes:[/びんぼ[ーう]|貧乏|貧困|底辺/g, /成り?上が?り/g], add:50},
  { regexes:[/(気にな(る|ってる|っちゃう)|興味[がの]?ある|ちょっと好きな?|[見み]てみたい)(方|かた|人|ひと|[男女][性子]|お(兄|に[いぃ]|姉|ね[えぇ])さん|メンズ)(だけ)?[にを]?/g], add:50},
  { regexes:[REGEX_SEXUAL_DESIRE, /(強|つよ)め|獣|けもの|異常|宇宙|お[化ば]け|鬼|(馬|うま)(並み?|なみ)/g], add:50},
  { regexes:[/お迎え行きます/g], add:20},
  { regexes:[/セフ[レ友]/g], add:20},
  { regexes:[/(大人|オトナ|体)の関係/g], add:20},
  { regexes:[/[チマ]ン凸/g], add:20},
  { regexes:[/(パパ|ママ)活/g], add:20},
  { regexes:[/※お金(の関係|とか)(興味|きょ[うー]み|[欲ほ]しく)[無な][いぃ]ので/g], add:20},
  { regexes:[/[男女]性|(男|女|おとこ|おんな)の[こ子]|ママ|パパ/g, /マッチング|仲介|紹介/g], add:20},
  { regexes:[/不倫/g], add:20},
  { regexes:[/すぐに?[濡ぬ]れ(ちゃう|ます)/g], add:20},
  { regexes:[REGEX_AGE, REGEX_LENGTH], add:20},
  { regexes:[REGEX_AGE, REGEX_BUST], add:20},
  { regexes:[REGEX_LENGTH, REGEX_BUST], add:20},
  { regexes:[/オナニスト/g], add:20},
  { regexes:[/ヤリ(マン|チン)|ビッチ/g], add:20},
  { regexes:[/今日の下着/g], add:20},
  { regexes:[/オ[ナ●〇★☆]ニー|自慰|(ひとり|[一1]人)(えっち|H)|自慰/g], add:20},
  { regexes:[/オナホ(ール)?/g], add:20},
  { regexes:[/おっぱい|まんこ|クリ(トリス|派)|ア[ナ●〇★☆]ル|処女/g], add:20},
  { regexes:[/ペニス|ちんちん|ちんこ|童貞|前立腺/g], add:20},
  { regexes:[/セックス|\bsex\b|夜の営み|オ[フ●〇★☆]パコ/g], add:20},
  { regexes:[/正常位|後背位|騎乗位|座位|立位|([立た]ち|寝)バック|側位/g], add:20},
  { regexes:[/フェラ(チオ)?/g], add:20},
  { regexes:[/放尿/g], add:20},
  { regexes:[/首[締絞]め/g], add:20},
  { regexes:[/騎乗位/g], add:20},
  { regexes:[/エロテロリスト/g], add:20},
  { regexes:[/夜なら時間あります/g], add:20},
  { regexes:[/オカズに(なる|され)たい/g], add:20},
  { regexes:[/見られたい症候群/g], add:20},
  { regexes:[/インサイダー情報/g], add:20},
  { regexes:[/顔びみょ/g, /全振り/g], add:20},
  { regexes:[REGEX_SEXUAL_DESIRE], add:20},
  { regexes:[REGEX_MEDIA, /(オナ|えっ?ちな?|丸見え|大人|オトナ)/g], add:20},
  { regexes:[REGEX_MEDIA, REGEX_CASTING], add:10},
  { regexes:[REGEX_CASTING, /↓{4,}/g], add:10},
  { regexes:[REGEX_MEDIA, /↓{4,}/g], add:10},
  { regexes:[/フォロワー[減へ]ってる/g], add:10},
  { regexes:[/慰め/g], add:10},
  { regexes:[/18禁/g], add:10},
  { regexes:[/快楽/g], add:10},
  { regexes:[/快感研究/g], add:10},
  { regexes:[/娘の(彼|カレ)/g], add:10},
  { regexes:[/痴漢/g], add:10},
  { regexes:[/line.me/g], add:10},
  { regexes:[/エロい?|\bHな|エッ?チな?|えっ?ち[いぃ]?|えちえち|スケベ/g], add:10},
  { regexes:[/(気持ち|きもち)[良い][いー]/g], add:10},
  { regexes:[/\b[\d,]+万円/g], add:10},
  { regexes:[/\b[\d,]+億円?/g], add:10},
  { regexes:[/\d*社を?経営/g], add:10},
  { regexes:[/\bLINE\b/g], add:10},
  { regexes:[/\bPayPay\b|ペイペイ/g], add:10},
  { regexes:[/噛まれ|攻められ/g], add:10},
  { regexes:[/ヤリたい/g], add:10},
  { regexes:[/ムラムラ/g], add:10},
  { regexes:[/役に[立た]ちた(い|くて)/g], add:10},
  { regexes:[/\bFIRE\b/g], add:10},
  { regexes:[/[見み][せ●〇★☆][合あ]い|[見み]せ([合あ]い)?っこ/g], add:10},
  { regexes:[/フォロバ|相互フォロー/g, /(💯|100)[%％]?|支援/g], add:10},
  { regexes:[/[出で][会あ](い|える)|会える?/g], add:10},
  { regexes:[/定期可能/g], add:10},
  { regexes:[/サロン/g], add:10},
  { regexes:[/セミナー|講座|塾/g], add:10},
  { regexes:[/(裏|ウラ)(垢|アカ)/g], add:10},
  { regexes:[/過激|カゲキ|(刺激|シゲキ)的/g], add:10},
  { regexes:[/フェチ/g], add:10},
  { regexes:[/抽選/g], add:10},
  { regexes:[/当選/g], add:10},
  { regexes:[/高確率|確率変動/g], add:10},
  { regexes:[/(稼|かせ)(ぎ|げ[るば]|ぐ|い[だで])/g], add:10},
  { regexes:[/儲(か(る|り|った)|け[たて]?)/g], add:10},
  { regexes:[/お(金|かね)を[増ふ]やす/g], add:10},
  { regexes:[/売り?上げ?|収益|利益|収入|手取り|リターン?/g], add:10},
  { regexes:[/爆益/g], add:10},
  { regexes:[/変態|HENTAI/g], add:10},
  { regexes:[/秘密厳守/g], add:10},
  { regexes:[REGEX_FREE, /入手/g], add:10},
  { regexes:[/プレイが(したい|[す好]き)/g], add:10},
  { regexes:[/カジュアルパートナー/g], add:10},
  { regexes:[/(大人|オトナ)希望/g], add:10},
  { regexes:[/すぐお?金になる/g], add:10},
  { regexes:[/アルバイト/g, /給与|[日時]給|日払い/g], add:10},
  { regexes:[/勤務時間は制限ありません/g], add:10},
  { regexes:[/夜のお店|キャバ嬢/g], add:10},
  { regexes:[/彼[氏女]|カレシ|カノジョ/g, /[無な]し|[居い]る/g], add:10},
  { regexes:[REGEX_GRADE, REGEX_LONELY], add:10},
  { regexes:[REGEX_LIVING_ALONE, REGEX_LONELY], add:10},
  { regexes:[REGEX_MARRIAGE_STATE, REGEX_LONELY], add:10},
  { regexes:[REGEX_LIVING_ALONE, REGEX_MARRIAGE_STATE], add:10},
  { regexes:[REGEX_CLUB, REGEX_GRADE], add:10},
  { regexes:[REGEX_LIVING_ALONE, REGEX_JOB], add:10},
  { regexes:[REGEX_LIVING_ALONE, REGEX_REGION], add:10},
  { regexes:[REGEX_REGION, REGEX_JOB], add:10},
  { regexes:[/連絡先|画像|動画/g, /交換/g], add:10},
  { regexes:[/凍結回避|凍避/g], add:10},
  { regexes:[/条件が?合えば|相性を?確かめ/g], add:10},
  { regexes:[/自動/g], add:5}, // todo: bot の判定をちゃんとやる
  { regexes:[/イイコト/g], add:5}, // todo: カタカナだけにヒットさせたい
  { regexes:[/美男美女/g], add:5},
  { regexes:[/楽天/g], add:5},
  { regexes:[/メルカリ/g], add:5},
  { regexes:[/アフィリエイト/g], add:5},
  { regexes:[/秘密|ヒミツ|内緒|ナイショ|秘訣|ヒケツ/g], add:5},
  { regexes:[/コミュニティ/g, /運営|お手伝い/g], add:5},
  { regexes:[/即金/g], add:5},
  { regexes:[/お[じば]さん/g, /[す好]き/g], add:5},
  { regexes:[/ストレス発散/g], add:5},
  { regexes:[/インストール/g], add:5},
  { regexes:[/ライン/g], add:5},
  { regexes:[/(虐|い[じぢ])め(て|る|られ)/g], add:5},
  { regexes:[/イチャ甘/g], add:5},
  { regexes:[/\bDM\b|チャット|トーク|通話|メッセ|ﾒｯｾ/g], add:5},
  { regexes:[/特別な(友達|友だち|ともだち)/g], add:5},
  { regexes:[/投資/g], add:5},
  { regexes:[/株/g, /分析/g], add:5},
  { regexes:[/バイナリー/g], add:5},
  { regexes:[/仮想通貨/g], add:5},
  { regexes:[/為替|\bFX\b/g], add:5},
  { regexes:[/資産/g], add:5},
  { regexes:[/運用/g], add:5},
  { regexes:[/達成/g], add:5},
  { regexes:[/女?社長|コンサル(タント)?|\bOL\b|看護(師|学生)|[新人]妻|主婦|既婚者|セレブママ|大学生|大学\d年生?|だいがくせ[いー]|\bJ[KD]\d?\b/g], add:5},
  { regexes:[/[男女]子|(男|女|[おぉ]とこ|[おぉ]んな)の[子こ]/g], add:5},
  { regexes:[/プレイ/g], add:5},
  { regexes:[REGEX_AGE], add:5},
  { regexes:[REGEX_REGION], add:5},
  { regexes:[/性格/g, /\b[MS]\b/g], add:5},
  { regexes:[/(下|シモ)ネタ/g, /[す好]き/g], add:5},
  { regexes:[/バナナ|🍌/g], add:5},
  { regexes:[/募集|ぼしゅ[うー]|受け?付け?|うけつけ/g], add:5},
  { regexes:[/(在宅|ノマド)ワー(ク|カー)/g], add:5},
  { regexes:[/助けたい/g], add:5},
  { regexes:[/起業/g], add:5},
  { regexes:[/副業/g], add:5},
  { regexes:[/恋愛/g], add:5},
  { regexes:[/恋人|コイビト/g], add:5},
  { regexes:[/離婚/g], add:5},
  { regexes:[/デート/g], add:5},
  { regexes:[/パートナー|お相手/g], add:5},
  { regexes:[/(仲|なか)[良よ]し/g], add:5},
  { regexes:[/メンヘラ/g], add:5},
  { regexes:[/キュンキュン/g], add:5},
  { regexes:[/(友達|友だち|ともだち)になって/g], add:5},
  { regexes:[/絡みに行く/g], add:5},
  { regexes:[/フォローして|フォロリツ|絡んで|こっち[来き]て/g], add:5},
  { regexes:[/貧乏|底辺|低賃金/g], add:5},
  { regexes:[/[年月]収|手取り?/g], add:5},
  { regexes:[/金持ち|セレブ/g], add:5},
  { regexes:[/口座/g], add:5},
  { regexes:[/レクチャー|お教えします|教えます/g], add:5},
//{ regexes:[/[❤🩷🧡💛💚💙🩵💜🤎🖤🩶🤍💘💓💔💕💖💗💝💞💟❣😍😘😻🏩💌💒💋♀♂💑💏]/g], add:5}, // todo: 機能してなさそう
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

window.onload = function() {
  const body = document.querySelector('body');
  const observer = new MutationObserver(function(mutations) {
    if (lastLocation != document.location.href) {
      lastLocation = document.location.href;
      followButtons = [];
      followerListRoot = null;
      finishedElems = [];
    }
  });

  observer.observe(body, {
    childList: true,
    subtree: true,
  });
};

setTimeout(scanUsers, PROCESS_INTERVAL_MS);

function scanUsers() {
  if (document.location.href.match(/^https:\/\/(twitter|x)\.com\/\w+\/\w*followers/)) {
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

  const text = normalizeForHitTest(getTextContentWithAlt(elm));

  // 評価
  var wordsToBeHighlighted = [];
  var add = 0;
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
      add += rule.add;
      wordsToBeHighlighted = wordsToBeHighlighted.concat(matchedWords);
    }
  });

  // キーワードハイライト
  wordsToBeHighlighted.forEach(kwd => {
    highlightKeyword(elm, kwd);
  });

  if (add <= 10) return;

  // ユーザのハイライト
  const MAX_ALPHA = 0.5;
  const alpha = Math.max(0, Math.min(MAX_ALPHA, add / 100));
  elm.style.backgroundColor = `rgba(255, 0, 0, ${alpha})`;
}

function highlightKeyword(elm, kwd) {
  const children = Array.from(elm.childNodes);
  children.forEach(child => {
    if (child.nodeType == Node.TEXT_NODE) {
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

// 画像 (emoji) の alt を含む textContent
function getTextContentWithAlt(elm) {
  if (elm) {
    if (elm.nodeType === Node.TEXT_NODE) {
      return elm.nodeValue;
    }
    else if (elm.nodeType === Node.ELEMENT_NODE) {
      if (elm.tagName.toLowerCase() === 'img') {
        return elm.alt;
      }
      else {
        let text = '';
        for (let child of elm.childNodes) {
          text += getTextContentWithAlt(child);
        }
        return text;
      }
    }
  }
  return '';
}

