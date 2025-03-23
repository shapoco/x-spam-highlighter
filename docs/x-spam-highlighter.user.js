// ==UserScript==
// @name        X Spam Highlighter
// @namespace   https://github.com/shapoco/x-spam-highlighter
// @updateURL   https://github.com/shapoco/x-spam-highlighter/raw/refs/heads/main/dist/x-spam-highlighter.user.js
// @downloadURL https://github.com/shapoco/x-spam-highlighter/raw/refs/heads/main/dist/x-spam-highlighter.user.js
// @match       https://x.com/*
// @version     1.3.391
// @author      Shapoco
// @description フォロワー覧でスパムっぽいアカウントを強調表示します
// @run-at      document-start
// @grant       GM.getValue
// @grant       GM.setValue
// ==/UserScript==

(function () {
  'use strict';

  const DEBUG_MODE = false;

  const APP_NAME = 'X Spam Highlighter';
  const SHORT_APP_NAME = 'XSHL';
  const SETTING_KEY = 'xsphl_settings';

  const PROCESS_INTERVAL_MS = 300;
  const KEYWORD_BACKGROUND_COLOR = 'rgba(255, 255, 0, 0.25)';

  const FOLLOW_BUTTON_DATA_ID_REGEX = /(\d+)-(un)?(follow|block)/;

  const REGEX_AGE = /[1-4]\d(歳|才|age|さい|↑|↓|[台代]([前後]半)?|中盤)|じゅ[うー](ご|ろく|なな|はち)|二十歳|はたち|アラ(サー|フォー|フィフ)/g; // todo: 先頭に \b があると効かない？
  const REGEX_LENGTH = /1[3-8]\d+(cm|㎝|センチ|│)/g; // todo: 先頭に \b があると効かない？
  const REGEX_BUST = /[A-Z](カップ|cup)/g; // todo: 先頭に \b があると効かない？
  const REGEX_REGION = /北海道|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|東京|神奈川|山梨|長野|新潟|富山|石川|福井|岐阜|静岡|愛知|三重|滋賀|京|大阪|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄|東北|関東|北陸|中部|近畿|中国|四国|九州|都内|(千代田|中央|港|新宿|文京|台東|墨田|江東|品川|目黒|大田|世田谷|渋谷|中野|杉並|豊島|北|荒川|板橋|練馬|足立|葛飾|江戸川|23)区|地方/g;
  const REGEX_MEDIA = /動画|写真?|録画/g;
  const REGEX_CASTING = /垂れ流し|配信|発信/g;
  const REGEX_LIVING_ALONE = /(ひとり|[1一]人)暮らし/g;
  const REGEX_MARRIAGE_STATE = /独身|未婚|既婚/g;
  const REGEX_LONELY = /(寂|さび)しい/g;
  const REGEX_JOB = /元?(\bOL\b|キャバ嬢|風俗|フ[ウー]ゾク|看護師|(カフェ|アパレル)店員|メンズ?エステ?|教[師諭])/g;
  const REGEX_GRADE = /(\b[1-3]|[一二三])年生?|[高大]([一二三]|[1-3]\b)/g;
  const REGEX_CLUB = /(水泳|演劇|卓球|バレー|吹奏楽|美術)部/g;
  const REGEX_SEXUAL_DESIRE = /(性|せ[ーいぃ])(欲|[よょ]く)|欲求不満|[溜た]まってる/g;
  const REGEX_FREE = /無料|無償|フリー/g;

  // 評価ルール
  const RULES = [
    //{ regexes:[/あ/g], add:100}, // テスト用
    { regexes: [/お金|現金|\d*万円/g, /配布|配り|配る|配っ[てた]?|プレゼント|分配|給付/g], add: 50 },
    { regexes: [/びんぼ[ーう]|貧乏|貧困|底辺/g, /成り?上が?り/g], add: 50 },
    { regexes: [/(気にな(る|ってる|っちゃう)|興味[がの]?ある|ちょっと好きな?|[見み]てみたい)(方|かた|人|ひと|[男女][性子]|お(兄|に[いぃ]|姉|ね[えぇ])さん|メンズ)(だけ)?[にを]?/g], add: 50 },
    { regexes: [REGEX_SEXUAL_DESIRE, /(強|つよ)め|獣|けもの|異常|宇宙|お[化ば]け|鬼|(馬|うま)(並み?|なみ)/g], add: 50 },
    { regexes: [/通話の?相手を(探|さが)してい?ます/g], add: 50 },
    { regexes: [/秘密の感情/g], add: 50 },
    { regexes: [/せふが[欲ほ]しー+/g], add: 50 },
    { regexes: [/お迎え行きます/g], add: 20 },
    { regexes: [/セフ[レ友]/g], add: 20 },
    { regexes: [/(大人|オトナ|体)の関係/g], add: 20 },
    { regexes: [/[チマ]ン凸/g], add: 20 },
    { regexes: [/(パパ|ママ)活/g], add: 20 },
    { regexes: [/※お金(の関係|とか)(興味|きょ[うー]み|[欲ほ]しく)[無な][いぃ]ので/g], add: 20 },
    { regexes: [/フォローの?[無な]い[人方]はちょっと(怖|こわ)いかな/g], add: 20 },
    { regexes: [/[男女]性|(男|女|おとこ|おんな)の[こ子]|ママ|パパ/g, /マッチング|仲介|紹介/g], add: 20 },
    { regexes: [/不倫/g], add: 20 },
    { regexes: [/すぐに?[濡ぬ]れ(ちゃう|ます)/g], add: 20 },
    { regexes: [REGEX_AGE, REGEX_LENGTH], add: 20 },
    { regexes: [REGEX_AGE, REGEX_BUST], add: 20 },
    { regexes: [REGEX_LENGTH, REGEX_BUST], add: 20 },
    { regexes: [/オナニスト/g], add: 20 },
    { regexes: [/ヤリ(マン|チン)|ビッチ/g], add: 20 },
    { regexes: [/今日の下着/g], add: 20 },
    { regexes: [/オ[ナ●〇★☆]ニー|自慰|(ひとり|[一1]人)(えっち|H)|自慰/g], add: 20 },
    { regexes: [/オナホ(ール)?/g], add: 20 },
    { regexes: [/おっぱい|まんこ|クリ(トリス|派)|ア[ナ●〇★☆]ル|処女/g], add: 20 },
    { regexes: [/ペニス|ちんちん|ちんこ|童貞|前立腺/g], add: 20 },
    { regexes: [/セックス|\bsex\b|夜の営み|オ[フ●〇★☆]パコ/g], add: 20 },
    { regexes: [/正常位|後背位|騎乗位|座位|立位|([立た]ち|寝)バック|側位/g], add: 20 },
    { regexes: [/フ[ェ●〇★☆]ラ(チオ)?/g], add: 20 },
    { regexes: [/ク[ン●〇★☆]ニ/g], add: 20 },
    { regexes: [/放尿/g], add: 20 },
    { regexes: [/射精/g], add: 20 },
    { regexes: [/レイプ/g], add: 20 },
    { regexes: [/首[締絞]め/g], add: 20 },
    { regexes: [/騎乗位/g], add: 20 },
    { regexes: [/エロテロリスト/g], add: 20 },
    { regexes: [/夜なら時間あります/g], add: 20 },
    { regexes: [/オカズに(なる|され)たい/g], add: 20 },
    { regexes: [/(おか|犯)されたい/g], add: 20 },
    { regexes: [/見られたい症候群/g], add: 20 },
    { regexes: [/インサイダー情報/g], add: 20 },
    { regexes: [/顔びみょ/g, /全振り/g], add: 20 },
    { regexes: [/(オナ|おな)指示/g], add: 20 },
    { regexes: [REGEX_SEXUAL_DESIRE], add: 20 },
    { regexes: [REGEX_MEDIA, /(オナ|えっ?ちな?|丸見え|大人|オトナ)/g], add: 20 },
    { regexes: [REGEX_MEDIA, REGEX_CASTING], add: 10 },
    { regexes: [REGEX_CASTING, /↓{4,}/g], add: 10 },
    { regexes: [REGEX_MEDIA, /↓{4,}/g], add: 10 },
    { regexes: [/フォロワー[減へ]ってる/g], add: 10 },
    { regexes: [/フォロー(嬉|うれ)しい/g], add: 10 },
    { regexes: [/親と(喧嘩|けんか)した/g], add: 10 },
    { regexes: [/ここだけのお楽しみ/g], add: 10 },
    { regexes: [/胸の大きさ/g], add: 10 },
    { regexes: [/慰め/g], add: 10 },
    { regexes: [/18禁/g], add: 10 },
    { regexes: [/快楽/g], add: 10 },
    { regexes: [/快感研究/g], add: 10 },
    { regexes: [/娘の(彼|カレ)/g], add: 10 },
    { regexes: [/痴漢/g], add: 10 },
    { regexes: [/ムチボディ|ぽっちゃり/g], add: 10 },
    { regexes: [/line.me/g], add: 10 },
    { regexes: [/エロい?|\bHな|エッ?チな?|えっ?ち[いぃ]?|えちえち|スケベ|夜の/g], add: 10 },
    { regexes: [/(気持ち|きもち)[良い][いー]/g], add: 10 },
    { regexes: [/\b[\d,]+万円/g], add: 10 },
    { regexes: [/\b[\d,]+億円?/g], add: 10 },
    { regexes: [/\d*社を?経営/g], add: 10 },
    { regexes: [/\b(LINE|line)\b/g], add: 10 }, // todo: 大文字小文字の無視
    { regexes: [/\b(PAYPAY|PayPay|paypay)\b|ペイペイ/g], add: 10 }, // todo: 大文字小文字の無視
    { regexes: [/噛まれ|攻められ/g], add: 10 },
    { regexes: [/ヤリたい/g], add: 10 },
    { regexes: [/ムラムラ/g], add: 10 },
    { regexes: [/女?王様/g], add: 10 },
    { regexes: [/役に[立た]ちた(い|くて)/g], add: 10 },
    { regexes: [/\bFIRE\b/g], add: 10 },
    { regexes: [/[見み][せ●〇★☆][合あ]い|[見み]せ([合あ]い)?っこ/g], add: 10 },
    { regexes: [/フォロバ|フォローバック|相互フォロー/g, /(💯|100)[%％]?|支援/g], add: 10 },
    { regexes: [/[出で][会あ](い|える)|会える?/g], add: 10 },
    { regexes: [/定期可能/g], add: 10 },
    { regexes: [/サロン/g], add: 10 },
    { regexes: [/セミナー|講座|塾/g], add: 10 },
    { regexes: [/(裏|ウラ)(垢|アカ)|(別|秘密用?)の?アカウント/g], add: 10 },
    { regexes: [/過激|カゲキ|(刺激|シゲキ)的/g], add: 10 },
    { regexes: [/フェチ/g], add: 10 },
    { regexes: [/抽選/g], add: 10 },
    { regexes: [/当選/g], add: 10 },
    { regexes: [/高確率|確率変動/g], add: 10 },
    { regexes: [/(稼|かせ)(ぎ|げ[るば]|ぐ|い[だで])/g], add: 10 },
    { regexes: [/儲(か(る|り|った)|け[たて]?)/g], add: 10 },
    { regexes: [/お(金|かね)を[増ふ]やす/g], add: 10 },
    { regexes: [/売り?上げ?|収益|利益|収入|手取り|リターン?/g], add: 10 },
    { regexes: [/爆益/g], add: 10 },
    { regexes: [/変態|HENTAI/g], add: 10 },
    { regexes: [/秘密厳守/g], add: 10 },
    { regexes: [REGEX_FREE, /入手/g], add: 10 },
    { regexes: [/プレイが(したい|[す好]き)/g], add: 10 },
    { regexes: [/カジュアルパートナー/g], add: 10 },
    { regexes: [/(大人|オトナ)希望/g], add: 10 },
    { regexes: [/すぐお?金になる/g], add: 10 },
    { regexes: [/アルバイト/g, /給与|[日時]給|日払い/g], add: 10 },
    { regexes: [/勤務時間は制限ありません/g], add: 10 },
    { regexes: [/夜のお店|キャバ嬢|ホスト|朝ホスト?/g], add: 10 },
    { regexes: [/彼[氏女]|カレシ|カノジョ|[男女]友(達|だち)/g, /[無な]し|[居い]る|欲し/g], add: 10 },
    { regexes: [REGEX_GRADE, REGEX_LONELY], add: 10 },
    { regexes: [REGEX_LIVING_ALONE, REGEX_LONELY], add: 10 },
    { regexes: [REGEX_MARRIAGE_STATE, REGEX_LONELY], add: 10 },
    { regexes: [REGEX_LIVING_ALONE, REGEX_MARRIAGE_STATE], add: 10 },
    { regexes: [REGEX_CLUB, REGEX_GRADE], add: 10 },
    { regexes: [REGEX_LIVING_ALONE, REGEX_REGION], add: 10 },
    { regexes: [REGEX_LIVING_ALONE, REGEX_JOB], add: 10 },
    { regexes: [REGEX_REGION, REGEX_JOB], add: 10 },
    { regexes: [REGEX_AGE, REGEX_JOB], add: 10 },
    { regexes: [REGEX_LENGTH, REGEX_JOB], add: 10 },
    { regexes: [REGEX_BUST, REGEX_JOB], add: 10 },
    { regexes: [/連絡先|画像|動画/g, /交換/g], add: 10 },
    { regexes: [/凍結回避|凍避/g], add: 10 },
    { regexes: [/条件が?合えば|相性を?確かめ/g], add: 10 },
    { regexes: [/もっとしたい/g], add: 10 },
    { regexes: [/連絡[待ま]って/g], add: 10 },
    { regexes: [/自動/g], add: 5 }, // todo: bot の判定をちゃんとやる
    { regexes: [/イイコト/g], add: 5 }, // todo: カタカナだけにヒットさせたい
    { regexes: [/美男美女/g], add: 5 },
    { regexes: [/楽天/g], add: 5 },
    { regexes: [/メルカリ/g], add: 5 },
    { regexes: [/アフィリエイト/g], add: 5 },
    { regexes: [/秘密|ヒミツ|内緒|ナイショ|秘訣|ヒケツ/g], add: 5 },
    { regexes: [/コミュニティ/g, /運営|お手伝い/g], add: 5 },
    { regexes: [/即金/g], add: 5 },
    { regexes: [/お[じば]さん/g, /[す好]き/g], add: 5 },
    { regexes: [/ストレス発散/g], add: 5 },
    { regexes: [/インストール/g], add: 5 },
    { regexes: [/ライン/g], add: 5 },
    { regexes: [/(虐|い[じぢ])め(て|る|られ)/g], add: 5 },
    { regexes: [/イチャ甘/g], add: 5 },
    { regexes: [/\bDM\b|チャット|トーク|通話|メッセ|ﾒｯｾ/g], add: 5 },
    { regexes: [/特別な(友達|友だち|ともだち)/g], add: 5 },
    { regexes: [/投資/g], add: 5 },
    { regexes: [/株/g, /分析/g], add: 5 },
    { regexes: [/バイナリー/g], add: 5 },
    { regexes: [/仮想通貨/g], add: 5 },
    { regexes: [/為替|\bFX\b/g], add: 5 },
    { regexes: [/資産/g], add: 5 },
    { regexes: [/運用/g], add: 5 },
    { regexes: [/達成/g], add: 5 },
    { regexes: [/女?社長|コンサル(タント)?|\bOL\b|看護(師|学生)|[新人]妻|主婦|既婚者|セレブママ|大学生|大学\d年生?|だいがくせ[いー]|\bJ[KD]\d?\b/g], add: 5 },
    { regexes: [/[男女]子|(男|女|[おぉ]とこ|[おぉ]んな)の[子こ]/g], add: 5 },
    { regexes: [/プレイ/g], add: 5 },
    { regexes: [REGEX_AGE], add: 5 },
    { regexes: [REGEX_REGION], add: 5 },
    { regexes: [/性格/g, /\b[MS]\b/g], add: 5 },
    { regexes: [/(下|シモ)ネタ/g, /[す好]き/g], add: 5 },
    { regexes: [/バナナ|🍌/g], add: 5 },
    { regexes: [/募集|ぼしゅ[うー]|受け?付け?|うけつけ/g], add: 5 },
    { regexes: [/(在宅|ノマド)ワー(ク|カー)/g], add: 5 },
    { regexes: [/助けたい/g], add: 5 },
    { regexes: [/起業/g], add: 5 },
    { regexes: [/副業/g], add: 5 },
    { regexes: [/恋愛/g], add: 5 },
    { regexes: [/恋人|コイビト/g], add: 5 },
    { regexes: [/離婚/g], add: 5 },
    { regexes: [/デート/g], add: 5 },
    { regexes: [/パートナー|お相手/g], add: 5 },
    { regexes: [/(仲|なか)[良よ]し/g], add: 5 },
    { regexes: [/メンヘラ/g], add: 5 },
    { regexes: [/キュンキュン/g], add: 5 },
    { regexes: [/(友達|友だち|ともだち)になって/g], add: 5 },
    { regexes: [/絡みに行く/g], add: 5 },
    { regexes: [/フォローして|フォロリツ|絡んで|こっち[来き]て/g], add: 5 },
    { regexes: [/貧乏|底辺|低賃金/g], add: 5 },
    { regexes: [/[年月]収|手取り?/g], add: 5 },
    { regexes: [/金持ち|セレブ/g], add: 5 },
    { regexes: [/口座/g], add: 5 },
    { regexes: [/レクチャー|お教えします|教えます/g], add: 5 },
    //{ regexes:[/[❤🩷🧡💛💚💙🩵💜🤎🖤🩶🤍💘💓💔💕💖💗💝💞💟❣😍😘😻🏩💌💒💋♀♂💑💏]/g], add:5}, // todo: 機能してなさそう
  ].map(rule => {
    rule.regexes = rule.regexes.map(regex => {
      const tmp = regex.toString();
      return new RegExp(toHiragana(tmp.substring(1, tmp.length - 2)), 'g');
    });
    return rule;
  });

  // 検索避け文字
  const SEARCH_OBST_CHAR_REGEX = /[ /\\.\|]/g;
  const SEARCH_OBST_CHAR_REGEX_STR = (function () {
    const tmp = SEARCH_OBST_CHAR_REGEX.toString();
    return tmp.substring(1, tmp.length - 2);
  })();

  class XSpamHighlighter {
    constructor() {
      this.lastLocation = null;
      this.mediaElems = [];
      this.finishedElems = [];
      this.users = {};
      this.nextContainerDataId = 0;
      this.settings = {
        safeUsers: {},
      };
    }

    start() {
      window.onload = async () => {
        await this.loadSettings();

        const body = document.querySelector('body');
        const observer = new MutationObserver((mutations) => {
          if (this.lastLocation != document.location.href) {
            debugLog(`Page changed`);
            this.lastLocation = document.location.href;
            this.mediaElems = [];
            this.finishedElems = [];
            this.users = {};
          }
        });

        observer.observe(body, {
          childList: true,
          subtree: true,
        });
      };

      this.intervalId = window.setInterval(() => {
        const mFollowList = document.location.href.match(/^https:\/\/x\.com\/\w+\/(verified_followers|followers_you_follow|followers|following)/);
        const mProfile = document.location.href.match(/^https:\/\/x\.com\/(\w+)(\/(with_replies|media))?\/?(\?.+)?$/);
        if (mFollowList) {
          // フォロー/フォロワー一覧
          this.scanUsers();
          this.highlightLocks();
        }
        else if (mProfile) {
          const postfix = mProfile[3];
          // プロフィールページ
          this.scanProfile();
          if (postfix == 'media') {
            // メディア一覧
            this.scanMedia();
          }
        }
      }, PROCESS_INTERVAL_MS);
    }

    scanUsers() {
      const newUserDiv =
        Array.from(document.querySelectorAll('div[data-testid="cellInnerDiv"]'))
          .filter(elm => elm.dataset && !elm.dataset.xshl_known);

      for (const div of newUserDiv) {
        let user = new UserInfo();
        if (div.dataset.xshl_info_id) {
          user = this.users[div.dataset.xshl_info_id];
        }
        else {
          const info_id = this.nextContainerDataId++;
          div.dataset.xshl_info_id = info_id;
          this.users[div.dataset.xshl_info_id] = user;
        }

        if (user.readFromHtml(div)) {
          div.dataset.xshl_known = true;
          this.showEstimatedCreatedDate(user);
          this.highlightSpamKeywords(user);
        }
        else if (!user.followButton) {
          // フォローボタンが見つからない場合は諦める
          div.dataset.xshl_known = true;
        }
      }
    }

    /**
     * @param {UserInfo} user 
     */
    showEstimatedCreatedDate(user) {
      if (isNull(user.followButton, `follow button for @${user.sn}`)) return;

      try {
        // アカウント作成日を推定
        const estTime = esitimateTimeFromId(user.uid);
        const age = document.createElement('span');
        age.textContent = prettyDate(estTime);
        age.title = `推定作成日: ${new Date(estTime).toLocaleDateString()}\nby ${APP_NAME}`;

        // 作成日が近いものは強調表示
        const MONTH_MIN = 3;
        const MONTH_MAX = 6;
        let alpha = 0;
        const month = (new Date().getTime() - estTime) / (1000 * 86400 * (365.2425 / 12));
        if (month < MONTH_MAX) {
          alpha = Math.min(1, (MONTH_MAX - month) / (MONTH_MAX - MONTH_MIN));
          age.style.fontWeight = 'bold';
        }
        const r = Math.min(255, 128 + Math.floor(alpha * 64));
        const g = Math.max(0, 128 - Math.floor(alpha * 128));
        const b = Math.min(255, 128 + Math.floor(alpha * 127));
        age.style.color = `rgb(${r}, ${g}, ${b})`;

        // 安全なフォロワーアイコン
        const safeButton = document.createElement('button');
        safeButton.style.backgroundColor = 'transparent';
        safeButton.style.border = 'none';
        safeButton.style.cursor = 'pointer';
        safeButton.style.fontSize = '12px';
        safeButton.style.padding = '0';
        safeButton.style.margin = '0';
        safeButton.textContent = '🛡️';
        const updateSafeButton = () => {
          if (this.isUserSafe(user.uid)) {
            safeButton.style.filter = 'drop-shadow(0 0 5px rgba(0, 255, 0, 0.75))';
            safeButton.style.transform = 'scale(1.25)';
            safeButton.style.opacity = 1;
            safeButton.title = 'このユーザの安全マークを解除する';
          }
          else {
            safeButton.style.filter = 'grayscale(100%)';
            safeButton.style.transform = 'scale(1.25)';
            safeButton.style.opacity = 0.5;
            safeButton.title = 'このユーザを安全としてマークする';
          }
        };
        updateSafeButton();

        safeButton.addEventListener('click', async () => {
          await this.toggleSafeUser(user.uid);
          updateSafeButton();
        });

        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.right = '10px';
        div.style.top = '-20px';
        div.style.fontSize = '12px';
        div.style.whiteSpace = 'nowrap';
        div.appendChild(age);
        div.appendChild(document.createTextNode(' | '));
        div.appendChild(safeButton);

        user.followButton.parentElement.appendChild(div);
      }
      catch (e) {
        debugLog(e);
      }
    }

    /**
     * @param {UserInfo} user 
    */
    highlightSpamKeywords(user) {
      const isSafe = user.uid && this.isUserSafe(user.uid);

      if (!user.descDiv || user.descDiv.textContent.trim().length == 0) {
        // プロフィールが空のユーザを強調表示
        const div = document.createElement('div');
        div.textContent = '(空のプロフィール)';
        div.title = `by ${APP_NAME}`;
        div.style.position = 'absolute';
        div.style.left = '50%';
        div.style.top = '50%';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.padding = '5px';
        div.style.backgroundColor = isSafe ? 'rgba(128, 128, 128, 0.2)' : 'rgba(255, 255, 0, 0.5)';
        div.style.borderRadius = '5px';
        div.style.opacity = 0.5;
        div.style.fontSize = '12px';
        user.containerDiv.appendChild(div);
      }

      let elms = [];
      if (user.nameLink) elms.push(user.nameLink);
      if (user.descDiv) elms.push(user.descDiv);

      if (isSafe) return;

      let totalScore = 0;
      for (let elm of elms) {
        const text = this.normalizeForHitTest(getTextContentWithAlt(elm));

        // 評価
        var wordsToBeHighlighted = [];
        RULES.forEach(rule => {
          var allMatched = true;
          var matchedWords = [];

          // ルールに定義された全ての正規表現にマッチするか確認する
          rule.regexes.forEach(regex => {
            const regexMod = new RegExp(regex.source, 'i');
            const matches = text.match(regexMod);
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
            totalScore += rule.add;
            wordsToBeHighlighted = wordsToBeHighlighted.concat(matchedWords);
          }
        });

        // キーワードハイライト
        wordsToBeHighlighted.forEach(kwd => {
          this.highlightKeyword(elm, kwd);
        });
      }

      if (totalScore <= 10) return;

      // ユーザのハイライト
      const MAX_ALPHA = 0.5;
      const alpha = Math.max(0, Math.min(MAX_ALPHA, totalScore / 100));
      user.containerDiv.style.backgroundColor = `rgba(255, 0, 0, ${alpha})`;
    }

    /**
     * @param {HTMLElement} elm 
     * @param {string} kwd 
     */
    highlightKeyword(elm, kwd) {
      const children = Array.from(elm.childNodes);
      children.forEach(child => {
        if (child.nodeType == Node.TEXT_NODE) {
          // テキスト要素
          const childText = child.nodeValue;
          if (this.normalizeForHitTest(childText).includes(kwd)) {
            const span = document.createElement('span');
            span.innerHTML = this.replaceTextContent(childText, kwd);
            span.title = `by ${APP_NAME}`;
            const frag = document.createDocumentFragment();
            frag.appendChild(span);
            child.parentNode.replaceChild(frag, child);
          }
        }
        else {
          // テキスト要素以外
          const childText = child.textContent;
          if (this.normalizeForHitTest(childText).includes(kwd)) {
            if (childText == child.innerHTML) {
              child.innerHTML = this.replaceTextContent(childText, kwd);
            }
            else {
              this.highlightKeyword(child, kwd);
            }
          }
        }
      });
    }

    /**
     * @param {string} text 
     * @param {string} kwd 
     * @returns {string}
     */
    replaceTextContent(text, kwd) {
      // 検索用に正規化
      const normText = this.normalizeForReplace(text);

      // 検索避け文字を考慮して検索用正規表現作成
      const kwdChars = kwd.split('').map(c => c.replaceAll(/([\*\+\.\?\{\}\(\)\[\]\^\$\-\|\/])/g, '\\$1'));
      const kwdRegex = new RegExp(`(${kwdChars.join(SEARCH_OBST_CHAR_REGEX_STR + '?')})`, 'dg');

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

    /**
     * @param {string} orig 
     * @returns {string}
     */
    normalizeForReplace(orig) {
      var ret = toNarrow(toHiragana(orig))
        .replaceAll(/[―─]/g, 'ー');
      console.assert(orig.length == ret.length);
      return ret;
    }

    /**
     * @param {string} orig 
     * @returns {string}
     */
    normalizeForHitTest(orig) {
      return this.normalizeForReplace(orig).replaceAll(SEARCH_OBST_CHAR_REGEX, '');
    }

    /** 鍵マークの強調表示 */
    highlightLocks() {
      const svgs = Array.from(document.querySelectorAll('svg'))
        .filter(elem => elem.dataset.testid && elem.dataset.testid == 'icon-lock');
      for (let svg of svgs) {
        const COLOR = '#c040ff';
        if (svg.style.fill == COLOR) continue;
        svg.style.fill = COLOR;
        svg.style.filter = 'drop-shadow(0 0 5px rgba(192, 64, 255, 0.75))';
        svg.style.transform = 'scale(1.25)';
        svg.title = `強調表示 by ${APP_NAME}`;
      }
    }

    /** プロフィールページのスキャン */
    scanProfile() {
      const main = document.querySelector('main');
      if (!main) return;

      const mUrl = document.location.href.match(/^https:\/\/x\.com\/(\w+)$/);
      if (!mUrl) return;
      const sn = mUrl[1];

      const user = new UserInfo();
      if (!user.readFromJson(sn)) return;

      this.showNumberOfPost(user, main);
      this.showCreatedDate(user, main);
    }

    /**
     * フォロー数/フォロワー数/ポスト数を正確に表示する
     * @param {UserInfo} user
     * @param {HTMLElement} main 
     */
    showNumberOfPost(user, main) {
      const REGEX_NUM_FOLLOWINGS = /([\d,\.]+(\s*[万億])?)\s*(フォロー中)/i;
      const REGEX_NUM_FOLLOWERS = /([\d,\.]+(\s*[万億])?)\s*(フォロワー)/i;

      const findLink = (regex) => {
        for (let tag of ['a', 'button']) {
          const links = Array.from(main.querySelectorAll(tag)).filter(elm => elm.textContent.match(regex));
          if (links.length > 0) return links[0];
        }
        return null;
      };
      const followingLink = findLink(REGEX_NUM_FOLLOWINGS);
      const followerLink = findLink(REGEX_NUM_FOLLOWERS);
      if (isNull(followingLink, 'Following link')) return;
      if (isNull(followerLink, 'Follower link')) return;

      // ページ遷移しても要素が削除されないので uid で変化点検出する
      if (followingLink.dataset.xshl_known == user.uid && followerLink.dataset.xshl_known == user.uid) {
        return;
      }
      followingLink.dataset.xshl_known = user.uid;
      followerLink.dataset.xshl_known = user.uid;

      let computedStyle = window.getComputedStyle(followingLink);

      // フォロー数 / フォロワー数を正確に表示
      const updateLink = (link, regex, newNumber) => {
        if (!link || !newNumber) return;
        const m = link.textContent.match(regex);
        if (!m) return;
        const oldNumber = m[1];
        const spans = Array.from(link.querySelectorAll('span')).filter(span => span.innerHTML == oldNumber);
        if (spans.length == 0) return;
        const textSpan = spans[0];
        const oldStr = textSpan.textContent;
        const newStr = formatNumber(newNumber);
        spans[0].textContent = newStr;
        debugLog(`Number of followings/followers for @${user.sn} replaced: '${oldStr}' -> '${newStr}'`);
        computedStyle = window.getComputedStyle(spans[0]);
        link.title = `正確な値 by ${APP_NAME}`;
      };
      updateLink(followingLink, REGEX_NUM_FOLLOWINGS, user.numFollowings);
      updateLink(followerLink, REGEX_NUM_FOLLOWERS, user.numFollowers);

      const parent = findCommonParent(followingLink, followerLink, 5);
      if (isNull(parent, `Parent of links of following/followers for @${user.sn}`)) return;

      // ポスト数を表示
      if (!isNull(user.numPosts, `Number of posts for @${user.sn}`)) {
        let postsPerDay = '';
        // 投稿頻度
        if (user.numPosts > 0 && user.created) {
          const elapsedDays = (new Date().getTime() - user.created) / (86400 * 1000);
          const freq = Math.ceil((user.numPosts / elapsedDays) * 100) / 100;
          postsPerDay += `(${freq}/day)`;
        }

        // ページ遷移しても要素が削除されないので再利用する
        let button = document.querySelector('#xshlNumPosts');
        let numberElem = document.querySelector('#xshlNumPosts_number');
        let unitElem = document.querySelector('#xshlNumPosts_unit');
        if (!button) {
          button = document.createElement('div');
          button.title = `リポスト以外の投稿を検索 by ${APP_NAME}`;
          button.id = 'xshlNumPosts';
          button.display = 'inline';
          button.style.marginLeft = '20px';
          button.style.fontFamily = computedStyle.fontFamily;
          button.style.fontSize = computedStyle.fontSize;
          button.style.cursor = 'pointer';
          parent.appendChild(button);
        }
        if (!numberElem) {
          numberElem = document.createElement('strong');
          numberElem.id = 'xshlNumPosts_number';
          button.appendChild(numberElem);
        }
        if (!unitElem) {
          unitElem = document.createElement('span');
          unitElem.id = 'xshlNumPosts_unit';
          unitElem.style.opacity = '0.66';
          button.appendChild(unitElem);
        }

        numberElem.textContent = formatNumber(user.numPosts);
        unitElem.textContent = ` ポスト ${postsPerDay}`;

        // イベントを削除して再設定
        button.innerHTML = button.innerHTML; // イベント削除
        button.addEventListener('click', () => { window.open(`https://x.com/search?q=from%3A${user.sn}`, '_blank'); });
        button.addEventListener('mouseover', () => { button.style.textDecoration = 'underline'; });
        button.addEventListener('mouseout', () => { button.style.textDecoration = 'none'; });

        debugLog(`Number of posts added: ${button.textContent}`);
      }
    }

    /**
     * アカウントの作成日を正確に表示する
     * @param {UserInfo} user
     * @param {HTMLElement} main 
     */
    showCreatedDate(user, main) {
      if (isNull(user.created, `Created date for @${user.sn}`)) return;

      const containerSpan = main.querySelector('span[data-testid="UserJoinDate"]');
      if (isNull(containerSpan, 'Wrapper element of created date')) return;

      if (containerSpan.dataset.xshl_known && containerSpan.dataset.xshl_known == user.uid) return;
      containerSpan.dataset.xshl_known = user.uid;

      let textSpan = null;
      for (let span of Array.from(containerSpan.querySelectorAll('span'))) {
        if (span.textContent == span.innerHTML) {
          textSpan = span;
          break;
        }
      }
      if (isNull(textSpan, 'Text span of created date')) return;

      const oldStr = textSpan.textContent;
      const newStr = `${new Date(user.created).toLocaleDateString()} (${prettyDate(user.created)}) からXを利用中`;
      textSpan.textContent = newStr;
      textSpan.title = `正確な値 by ${APP_NAME}`;
      debugLog(`Created date was replaced: '${oldStr}' -> '${newStr}'`);
    }

    // メディア一覧のスキャン
    scanMedia() {
      const links = Array.from(document.querySelectorAll('a'));
      for (let link of links) {
        const m = link.href.match(/\/\w+\/status\/(\d+)\/(photo|video)\//);
        if (!m) continue;
        if (this.finishedElems.includes(link)) continue;
        // URLから作成日時を推定
        const estTime = esitimateTimeFromId(m[1]);
        const age = document.createElement('span');
        age.textContent = prettyDate(estTime);
        age.title = `推定投稿日: ${new Date(estTime).toLocaleDateString()}\nby ${APP_NAME}`;
        age.style.position = 'absolute';
        age.style.right = '5px';
        age.style.top = '5px';
        age.style.padding = '0px 10px';
        age.style.fontSize = '12px';
        age.style.color = 'white';
        age.style.borderRadius = '5px';
        age.style.backgroundColor = '#608';
        age.style.opacity = 0.75;
        link.parentElement.appendChild(age);
        this.finishedElems.push(link);
      }
    }

    isUserSafe(uid) {
      return uid in this.settings.safeUsers;
    }

    async toggleSafeUser(uid) {
      if (this.isUserSafe(uid)) {
        delete this.settings.safeUsers[uid];
      }
      else {
        this.settings.safeUsers[uid] = {};
      }
      await this.saveSettings();
    }

    async loadSettings() {
      try {
        this.settings = {
          safeUsers: {},
        };
        const jsonStr = await GM.getValue(SETTING_KEY);
        if (!jsonStr) return;
        const json = JSON.parse(jsonStr);
        if (!json) return;
        this.settings = Object.assign(this.settings, json);
      }
      catch (e) {
        debugLog(e);
      }
    }

    async saveSettings() {
      try {
        await GM.setValue(SETTING_KEY, JSON.stringify(this.settings));
      }
      catch (e) {
        debugLog(e);
      }
    }
  }

  class UserInfo {
    constructor() {
      /** @type {HTMLDivElement} */
      this.containerDiv = null;

      /** @type {HTMLElement} */
      this.followButton = null;

      /** @type {HTMLElement} */
      this.nameLink = null;

      /** @type {HTMLElement} */
      this.descDiv = null;

      /** @type {string} */
      this.uid = null;

      /** @type {string} */
      this.sn = null;

      /** @type {string} */
      this.name = null;
    }

    /** 
     * @param {HTMLDivElement} containerDiv 
     * @returns {boolean} 
     */
    readFromHtml(containerDiv) {
      this.containerDiv = containerDiv;

      // フォローボタンを見つける
      const btns = Array.from(containerDiv.querySelectorAll('button'))
        .filter(btn => btn.dataset.testid && btn.dataset.testid.match(FOLLOW_BUTTON_DATA_ID_REGEX));
      if (btns.length == 1) {
        this.followButton = btns[0];
      }
      isNull(this.followButton, 'Follow button');

      // フォローボタンの属性から User ID を取得
      if (this.followButton && this.followButton.dataset.testid) {
        const m = this.followButton.dataset.testid.match(FOLLOW_BUTTON_DATA_ID_REGEX);
        if (m) {
          this.uid = m[1];
        }
      }

      // フォローボタンの属性からスクリーンネームを取得 (取れない場合もある)
      if (!this.sn && this.followButton && this.followButton.ariaLabel) {
        const m = this.followButton.ariaLabel.match(/@([a-z0-9_]+)$/i);
        if (m) this.sn = m[1];
      }

      // プロフィールアイコンの属性からスクリーンネームを取得 (取れない場合もある)
      if (!this.sn) {
        const div = this.containerDiv.querySelector('div[data-testid^="UserAvatar-Container-"]');
        if (div) {
          const m = div.dataset.testid.match(/^UserAvatar-Container-(\w+)$/);
          if (m) this.sn = m[1];
        }
      }

      // プロフィールページへのリンクから名前を得る
      if (this.sn) {
        const profileLinks = Array.from(this.containerDiv.querySelectorAll(`a[href="/${this.sn}"]`));
        if (profileLinks.length >= 3) {
          if (profileLinks[2].textContent == `@${this.sn}`) {
            // 3個目のリンクがスクリーンネームなら多分1個目がアイコン、2個目が名前
            this.nameLink = profileLinks[1];
            this.name = getTextContentWithAlt(this.nameLink);
          }
        }
      }

      // 説明文の要素を見つける
      const descDivs = Array.from(this.containerDiv.querySelectorAll('div[dir="auto"]'));
      if (0 < descDivs.length && descDivs.length <= 3) {
        const tmp = descDivs[descDivs.length - 1];
        if (!tmp.textContent.match(/^クリックして\w+さんをフォロー$/) && tmp.style.display != 'none' && !tmp.id.startsWith('id__')) {
          this.descDiv = tmp;
        }
      }

      return !!this.followButton && !!this.uid && !!this.sn;
    }

    /** 
     * @param {string} sn
     * @returns {boolean}
     */
    readFromJson(sn) {
      console.assert(!!sn);
      this.sn = sn;

      const scripts = Array.from(document.querySelectorAll('script'))
        .filter(elem => elem.dataset && elem.dataset.testid && elem.dataset.testid == 'UserProfileSchema-test');

      let json = null;

      for (const script of scripts) {
        const j = JSON.parse(script.innerText);
        if (!j) continue;
        if (!j.mainEntity) continue;
        if (j.mainEntity.additionalName !== this.sn) continue;
        json = j;
      }

      if (!json) return false;

      const mainEntity = json.mainEntity;
      const interactionStatistic = mainEntity.interactionStatistic;

      try {
        if (mainEntity.givenName !== undefined && this.name === null) {
          this.name = mainEntity.givenName;
        }

        if (mainEntity.description !== undefined && this.desc === null) {
          this.desc = mainEntity.description;
        }

        if (mainEntity.identifier !== undefined && this.uid === null) {
          this.uid = mainEntity.identifier;
        }

        if (mainEntity.image !== undefined && mainEntity.image.contentUrl !== undefined && this.profileImageUrl === null) {
          this.profileImageUrl = mainEntity.image.contentUrl;
        }

        for (const stat of interactionStatistic) {
          if (stat.name == 'Follows') {
            this.numFollowers = stat.userInteractionCount;
          }
          else if (stat.name == 'Friends') {
            this.numFollowings = stat.userInteractionCount;
          }
          else if (stat.name == 'Tweets') {
            this.numPosts = stat.userInteractionCount;
          }
        }

        if (json.dateCreated !== undefined) {
          this.created = new Date(json.dateCreated).getTime();
        }
      }
      catch (ex) {
        debugLog(ex);
      }

      return true;
    }
  }

  /**
   * 要素 a と b の共通の親要素を返す
   * @param {HTMLElement} a 
   * @param {HTMLElement} b 
   * @param {number} maxDistance
   * @returns {HTMLElement|null}
   */
  function findCommonParent(a, b, maxDistance = 99999) {
    var parents = [];
    let distA = 0, distB = 0;
    while (a.parentElement && distA++ < maxDistance) {
      parents.push(a.parentElement);
      a = a.parentElement;
    }
    while (b.parentElement && distB++ < maxDistance) {
      if (parents.includes(b.parentElement)) {
        return b.parentElement;
      }
      b = b.parentElement;
    }
    return null;
  }

  /**
   * 画像 (emoji) の alt を含む textContent を返す
   * @param {HTMLElement} elm
   * @returns {string}
  */
  function getTextContentWithAlt(elm) {
    if (elm) {
      if (elm.nodeType === Node.TEXT_NODE) {
        return elm.nodeValue;
      }
      else if (elm.nodeType === Node.ELEMENT_NODE) {
        if (elm.tagName.toLowerCase() === 'img') {
          return elm.alt;
        }
        else if (elm.tagName.toLowerCase() === 'br') {
          return '\n';
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

  // User ID と作成日時の関係
  const USER_ID_DICT = [
    {
      18548500: new Date('2009-01-02').getTime(),
      129095500: new Date('2010-04-03').getTime(),
      341869500: new Date('2011-07-25').getTime(),
      473422500: new Date('2012-01-25').getTime(),
      1703770500: new Date('2013-08-27').getTime(),
      2475285500: new Date('2014-05-03').getTime(),
      3034548500: new Date('2015-02-21').getTime(),
    },
    {
      793757834504765000: new Date('2016-11-02').getTime(),
      831503904093315000: new Date('2017-02-14').getTime(),
      1086585820939575000: new Date('2019-01-19').getTime(),
      1332120443281685000: new Date('2020-11-27').getTime(),
      1412250140430145000: new Date('2021-07-06').getTime(),
      1518304543011785000: new Date('2022-04-25').getTime(),
      1644487268177185000: new Date('2023-04-08').getTime(),
      1745152119630445000: new Date('2024-01-11').getTime(),
      1894161355206525000: new Date('2025-02-25').getTime(),
      1900737971101595000: new Date('2025-03-15').getTime(),
    }
  ];

  // UserId から作成日時を推定
  function esitimateTimeFromId(uidStr) {
    const uid = parseFloat(uidStr);
    let id0 = -1, id1 = -1;
    let date0 = -1, date1 = -1;
    for (let i = 0; i < USER_ID_DICT.length; i++) {
      const dict = USER_ID_DICT[i];
      let logId0 = -1, logDate0 = -1, diff0 = Number.MAX_VALUE;
      let logId1 = -1, logDate1 = -1, diff1 = Number.MAX_VALUE;
      for (let key in dict) {
        const keyUid = parseFloat(key);
        const diff = Math.abs(uid - keyUid);
        if (diff < diff0) {
          logId1 = logId0;
          logDate1 = logDate0;
          logId0 = keyUid;
          logDate0 = dict[key];
          diff1 = diff0;
          diff0 = diff;
        }
        else if (diff < diff1) {
          logId1 = keyUid;
          logDate1 = dict[key];
          diff1 = diff;
        }
      }
      if (logId0 >= 0 && logId1 >= 0) {
        id0 = logId0; date0 = logDate0;
        id1 = logId1; date1 = logDate1;
        if (logId0 <= uid && uid < logId1) break;
      }
    }
    return date0 + (date1 - date0) * (uid - id0) / (id1 - id0);
  }

  function prettyDate(t) {
    const days = (new Date().getTime() - t) / (1000 * 86400);
    const years = days / 365.2425;
    const month = years * 12;
    if (days < 1) return '1日以内';
    if (month < 1) return `${Math.round(days)}日前`;
    if (years < 1) return `${Math.round(month * 10) / 10}ヶ月前`;
    return `${Math.round(years * 10) / 10}年前`;
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

  /**
   * @param {Object} obj 
   * @param {string} name 
   * @returns {boolean}
   */
  function isNull(obj, name) {
    const failed = (obj === null) || (obj === undefined);
    if (failed) debugLog(`${name} is null.`);
    return failed;
  }

  function debugLog(msg) {
    if (typeof msg === 'string' || typeof msg === 'number' || typeof msg === 'boolean') {
      if (DEBUG_MODE) {
        console.log(`[${SHORT_APP_NAME}] ${msg}`);
      }
    }
    else {
      console.error(`[${SHORT_APP_NAME}] ${msg}`);
    }
  }

  /** 
   * @param {number} num
   * @returns {string}
   */
  function formatNumber(num) {
    return num.toLocaleString('ja-JP');
  }

  window.xsphl = new XSpamHighlighter();
  window.xsphl.start();

})();
