// ==UserScript==
// @name        X Spam Highlighter (Debug)
// @namespace   http://localhost:51480/
// @updateURL   http://localhost:51480/x-spam-highlighter.user.js
// @downloadURL http://localhost:51480/x-spam-highlighter.user.js
// @match       https://x.com/*
// @version     1.4.496
// @author      Shapoco
// @description フォロワー欄でスパムっぽいアカウントを強調表示します
// @run-at      document-start
// @grant       GM.getValue
// @grant       GM.setValue
// ==/UserScript==

(function () {
  'use strict';

  const DEBUG_MODE = true;

  const APP_NAME = 'X Spam Highlighter';
  const SHORT_APP_NAME = 'XSHL';
  const SETTING_KEY = 'xsphl_settings';

  const PROCESS_INTERVAL_MS = 300;
  const KEYWORD_BACKGROUND_COLOR = 'rgba(255, 255, 0, 0.25)';

  const FOLLOW_BUTTON_DATA_ID_REGEX = /(\d+)-(un)?(follow|block)/;

  const SN_EXCLUDES = ['home', 'explore', 'messages', 'notifications', 'search'];

  // todo:
  // "/160cm/55kg/Ecup/OL/" みたいな文字列に対して検索避け文字除去すると
  // "160cm55kgEcupOL" になって単語の境目が分からなくなり \b が効かなくなる

  const REGEX_AGE = /[1-4]\d(歳|才|age|さい|↑|↓|[台代]([前後]半)?|中盤)|じゅ[うー](ご|ろく|なな|はち)|二十歳|はたち|アラ(サー|フォー|フィフ)/g;
  const REGEX_LENGTH = /1[3-8]\d(cm|㎝|センチ)/g;
  const REGEX_WEIGHT = /[4-6]\d(kg|㎏|キロ)/g;
  const REGEX_BUST = /[A-Z](カップ|cup)/g;
  const REGEX_REGION = /北海道|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|東京|神奈川|山梨|長野|新潟|富山|石川|福井|岐阜|静岡|愛知|三重|滋賀|京|大阪|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄|東北|関東|北陸|中部|近畿|中国|四国|九州|都内|(千代田|中央|港|新宿|文京|台東|墨田|江東|品川|目黒|大田|世田谷|渋谷|中野|杉並|豊島|北|荒川|板橋|練馬|足立|葛飾|江戸川|23)区|地方/g;
  const REGEX_MEDIA = /動画|写真?|録画/g;
  const REGEX_CASTING = /垂れ流し|配信|発信/g;
  const REGEX_LIVING_ALONE = /(ひとり|[1一]人)暮らし/g;
  const REGEX_MARRIAGE_STATE = /独身|未婚|既婚|シングル/g;
  const REGEX_LONELY = /(寂|さび)しい|かまってちゃん/g;
  const REGEX_JOB = /元?(\bOL\b|キャバ嬢?|風俗嬢?|フ[ウー]ゾク嬢?|ヘルス嬢?|デリヘル|看護師|歯科衛生士|(カフェ|アパレル)店員|メンズ?エステ?|エステティシャン|ヨガインストラクター|モデル|教[師諭])/g;
  const REGEX_GRADE = /(\b[1-3]|[一二三])年生?|[高大]([一二三]|[1-3]\b)/g;
  const REGEX_CLUB = /(水泳|演劇|卓球|バレー|吹奏楽|美術)部/g;
  const REGEX_SEXUAL_DESIRE = /(性|せ[ーいぃ])(欲|[よょ]く)|欲望|欲求不満|[溜た]まってる/g;
  const REGEX_FREE = /無料|無償|フリー/g;

  // 評価ルール
  const RULES = [
    //{ regexes:[/あ/g], add:100}, // テスト用
    { regexes: [/お金|現金|\d*万円/g, /配布|配り|配る|配っ[てた]?|プレゼント|分配|給付/g], add: 50 },
    { regexes: [/びんぼ[ーう]|貧乏|貧困|底辺/g, /成り?上が?り/g], add: 50 },
    { regexes: [/(気にな(る|ってる|っちゃう)|ちょっと好きな?|[見み]てみたい)(方|かた|人|ひと|[男女][性子]|お(兄|に[いぃ]|姉|ね[えぇ])さん|メンズ)(だけ)?[にを]?/g], add: 50 },
    { regexes: [REGEX_SEXUAL_DESIRE, /(強|つよ)め|獣|けもの|異常|宇宙|お[化ば]け|鬼|(馬|うま)(並み?|なみ)/g], add: 50 },
    { regexes: [/通話の?相手を(探|さが)してい?ます/g], add: 50 },
    { regexes: [/秘密の感情/g], add: 50 },
    { regexes: [/せふが[欲ほ]しー+/g], add: 50 },
    { regexes: [/([12]\d(♀|🚺|めす)|(♀|🚺|めす)[12]\d)\s*1[3-8]\dcm/g], add: 20 },
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
    { regexes: [REGEX_AGE, REGEX_WEIGHT], add: 20 },
    { regexes: [REGEX_AGE, REGEX_BUST], add: 20 },
    { regexes: [REGEX_LENGTH, REGEX_BUST], add: 20 },
    { regexes: [REGEX_WEIGHT, REGEX_BUST], add: 20 },
    { regexes: [REGEX_LENGTH, REGEX_WEIGHT], add: 20 },
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
    { regexes: [/(おか|犯|命令)されたい/g], add: 20 },
    { regexes: [/見られたい症候群/g], add: 20 },
    { regexes: [/インサイダー情報/g], add: 20 },
    { regexes: [/顔びみょ/g, /全振り/g], add: 20 },
    { regexes: [/(オナ|おな)指示/g], add: 20 },
    { regexes: [/人见知り?/g], add: 20 },
    { regexes: [/会话|话(す|せ|多め)/g], add: 20 },
    { regexes: [/闻く/g], add: 20 },
    { regexes: [/现实|実际/g], add: 20 },
    { regexes: [/一绪/g], add: 20 },
    { regexes: [/终わり/g], add: 20 },
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
    { regexes: [/[\d,]+万円/g], add: 10 },
    { regexes: [/[\d,]+億円?/g], add: 10 },
    { regexes: [/\d*社を?経営/g], add: 10 },
    { regexes: [/\bLINE\b/g], add: 10 }, // todo: 大文字小文字の無視
    { regexes: [/PAYPAY|ペイペイ/g], add: 10 }, // todo: 大文字小文字の無視
    { regexes: [/噛まれ|攻められ/g], add: 10 },
    { regexes: [/ムラムラ/g], add: 10 },
    { regexes: [/女?王様/g], add: 10 },
    { regexes: [/役に[立た]ちた(い|くて)/g], add: 10 },
    { regexes: [/\bFIRE\b/g], add: 10 },
    { regexes: [/[見み][せ●〇★☆][合あ]い|[見み]せ([合あ]い)?っこ/g], add: 10 },
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
    { regexes: [/彼[氏女ピ]|カレ[シピ]|カノ(ジョ|ピ)|[男女]友(達|だち)/g, /[無な]し|[居い]る|欲し/g], add: 10 },
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
    { regexes: [/貢ぎます/g], add: 10 },
    { regexes: [/連絡先|画像|動画/g, /交換/g], add: 10 },
    { regexes: [/凍結回避|凍避/g], add: 10 },
    { regexes: [/条件が?合えば|相性を?確かめ/g], add: 10 },
    { regexes: [/もっとしたい/g], add: 10 },
    { regexes: [/連絡([待ま]って|します|する)/g], add: 10 },
    { regexes: [/フォロバ|フォローバック|相互フォロー/g, /(💯|100)[%％]?|支援/g], add: 5 },
    { regexes: [/自動/g], add: 5 }, // todo: bot の判定をちゃんとやる
    { regexes: [/イイコト/g], add: 5 }, // todo: カタカナだけにヒットさせたい
    { regexes: [/ヤリたい/g], add: 5 }, // todo: カタカナだけにヒットさせたい
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
    { regexes: [/リンク|\blink\b/g], add: 5 },
    { regexes: [/ライン/g], add: 5 },
    { regexes: [/(虐|い[じぢ])め(て|る|られ)/g], add: 5 },
    { regexes: [/イチャ甘/g], add: 5 },
    { regexes: [/\bDM\b|チャット|トーク|通話|メッセ|ﾒｯｾ/g], add: 5 },
    { regexes: [/特別な(友達|友だち|ともだち)/g], add: 5 },
    { regexes: [/投[資资]/g], add: 5 },
    { regexes: [/株|証券|市場/g, /調査|分析|洞察/g], add: 5 },
    { regexes: [/バイナリー/g], add: 5 },
    { regexes: [/仮想通貨/g], add: 5 },
    { regexes: [/為替|\bFX\b/g], add: 5 },
    { regexes: [/[資资]産/g], add: 5 },
    { regexes: [/運用/g], add: 5 },
    { regexes: [/達成/g], add: 5 },
    { regexes: [/女?社長|コンサル(タント)?|アナリスト|ストラテジスト|\bOL\b|看護(師|学生)|[新人]妻|主婦|既婚者|セレブママ|大学生|大学\d年生?|だいがくせ[いー]|\bJ[KD]\d?\b/g], add: 5 },
    { regexes: [/[男女]子|(男|女|[おぉ]とこ|[おぉ]んな)の[子こ]/g], add: 5 },
    { regexes: [/プレイ/g], add: 5 },
    { regexes: [REGEX_AGE], add: 5 },
    { regexes: [REGEX_REGION], add: 5 },
    { regexes: [/性格/g, /\b[MS]\b/g], add: 5 },
    { regexes: [/(下|シモ)ネタ/g, /[す好]き/g], add: 5 },
    { regexes: [/バナナ|🍌|🍄/g], add: 5 },
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
    { regexes: [/貧乏|底辺|低賃金|どん底/g], add: 5 },
    { regexes: [/[年月]収|手取り?/g], add: 5 },
    { regexes: [/金持ち|セレブ/g], add: 5 },
    { regexes: [/口座/g], add: 5 },
    { regexes: [/レクチャー|お教えします|教えます|提供します/g], add: 5 },
    { regexes: [/[🔞♥❤🩷🧡💛💚💙🩵💜🤎🖤🩶🤍💘💓💔💕💖💗💝💞💟❣😍😚😘😻🏩💌💒💋♀♂🚺🚹💑💏]/g], add: 5 },
    { regexes: [/[💰💴💶💵💷🤑👛📈]/g], add: 5 },
    { regexes: [/[▶]/g], add: 5 },
  ].map(rule => {
    rule.regexes = rule.regexes.map(regex => {
      const tmp = regex.toString();
      return new RegExp(toHiragana(tmp.substring(1, tmp.length - 2)), 'gu');
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
        const mProfile = document.location.href.match(/^https:\/\/x\.com\/(\w+)(\/(with_replies|highlights|media))?\/?(\?.+)?$/);
        if (mFollowList) {
          // フォロー/フォロワー一覧
          this.scanUsers();
          this.highlightLocks();
        }
        else if (mProfile) {
          const sn = mProfile[1];
          if (!SN_EXCLUDES.includes(sn)) {
            const postfix = mProfile[3];
            // プロフィールページ
            this.scanProfile();
            if (postfix == 'media') {
              // メディア一覧
              this.scanMedia();
            }
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
          user.retryCount++;
          if (user.retryCount < 5) {
            debugLog(`Retrying for info_id=${div.dataset.xshl_info_id} (count=${user.retryCount})`);
          }
          else {
            // 何回かリトライしてもフォローボタンが見つからない場合は諦める
            debugLog(`Giving up for info_id=${div.dataset.xshl_info_id}`);
            div.dataset.xshl_known = true;
          }
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
        setAgeColor(age, estTime);

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
            const regexMod = new RegExp(regex.source, 'giu');
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
        else if (child.nodeType == Node.ELEMENT_NODE && child.tagName == 'IMG') {
          // 画像要素 (emoji)
          if (child.alt === kwd) {
            child.style.backgroundColor = KEYWORD_BACKGROUND_COLOR;
            child.title = `by ${APP_NAME}`;
          }
        }
        else {
          // テキストと emoji 以外
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
      if (isNull(main, 'main tag')) return;

      const mUrl = document.location.href.match(/^https:\/\/x\.com\/(\w+)/);
      if (isNull(mUrl, 'screen name')) return;
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
        let postsPerDay = null;
        let postFreq = '';
        // 投稿頻度
        if (user.numPosts > 0 && user.created) {
          const elapsedDays = (new Date().getTime() - user.created) / (86400 * 1000);
          postsPerDay = user.numPosts / elapsedDays;
          if (postsPerDay < 1) {
            const clog10 = Math.ceil(Math.log10(postsPerDay));
            const round = Math.pow(10, 2 - clog10);
            postsPerDay = Math.round(postsPerDay * round) / round;
          }
          else if (postsPerDay < 100) {
            postsPerDay = Math.round(postsPerDay * 10) / 10;
          }
          else {
            postsPerDay = Math.round(postsPerDay);
          }
          postFreq += `(${postsPerDay}/day)`;
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
        unitElem.textContent = ` ポスト ${postFreq}`;

        if (postsPerDay !== 0) {
          const gray = isDarkMode() ? 255 : 0;
          const alpha = Math.max(0, Math.min(1, 1 - postsPerDay / 0.3));
          const colorR = Math.floor(gray * (1 - alpha) + 192 * alpha);
          const colorG = Math.floor(gray * (1 - alpha) + 0 * alpha);
          const colorB = Math.floor(gray * (1 - alpha) + 255 * alpha);
          button.style.color = `rgb(${colorR}, ${colorG}, ${colorB})`;
        }

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

      const containerSpan = main.querySelector('a[data-testid="UserJoinDate"]');
      if (isNull(containerSpan, 'Wrapper element of created date')) return;

      if (containerSpan.dataset.xshl_known && containerSpan.dataset.xshl_known == user.uid) return;
      containerSpan.dataset.xshl_known = user.uid;

      let textSpan = containerSpan.querySelector('span[data-xshl_join_date="1"]');
      if (!textSpan) {
        for (let span of Array.from(containerSpan.querySelectorAll('span'))) {
          if (span.textContent == span.innerHTML) {
            textSpan = span;
            break;
          }
        }
      }
      if (isNull(textSpan, 'Text span of created date')) return;

      const createdDate = new Date(user.created);
      const oldStr = textSpan.textContent;
      textSpan.innerHTML = '';
      textSpan.appendChild(document.createTextNode(`${createdDate.toLocaleDateString()} (`));
      const ageSpan = document.createElement('span');
      ageSpan.textContent = prettyDate(user.created);
      setAgeColor(ageSpan, user.created);
      textSpan.appendChild(ageSpan);
      textSpan.appendChild(document.createTextNode(') からXを利用中'));
      textSpan.title = `${createdDate.toLocaleString()}\n正確な値 by ${APP_NAME}`;
      textSpan.dataset.xshl_join_date = "1";
      debugLog(`Created date was replaced: '${oldStr}' -> '${textSpan.textContent}'`);
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

      /** @type {number} */
      this.retryCount = 0;
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
        if (j.mainEntity.additionalName.toLowerCase() !== this.sn.toLowerCase()) continue;
        json = j;
      }

      if (isNull(json, 'JSON of user info')) return false;

      const mainEntity = json.mainEntity;
      const interactionStatistic = mainEntity.interactionStatistic;

      try {
        if (!!mainEntity.additionalName) {
          this.sn = mainEntity.additionalName;
        }

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
    let parents = [];
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
      4063350: new Date('2007-04-11').getTime(),
      4873950: new Date('2007-04-16').getTime(),
      5071550: new Date('2007-04-18').getTime(),
      5564850: new Date('2007-04-28').getTime(),
      6110950: new Date('2007-05-18').getTime(),
      9562550: new Date('2007-10-20').getTime(),
      11051950: new Date('2007-12-12').getTime(),
      14343150: new Date('2008-04-10').getTime(),
      21565150: new Date('2009-02-22').getTime(),
      24127350: new Date('2009-03-13').getTime(),
      27244050: new Date('2009-03-29').getTime(),
      58340950: new Date('2009-07-20').getTime(),
      61398850: new Date('2009-07-30').getTime(),
      76380150: new Date('2009-09-23').getTime(),
      86963150: new Date('2009-11-03').getTime(),
      129095500: new Date('2010-04-03').getTime(),
      140105500: new Date('2010-05-05').getTime(),
      225838500: new Date('2010-12-13').getTime(),
      256914500: new Date('2011-02-24').getTime(),
      341869500: new Date('2011-07-25').getTime(),
      410564500: new Date('2011-11-12').getTime(),
      473422500: new Date('2012-01-25').getTime(),
      1488106500: new Date('2013-06-07').getTime(),
      1703770500: new Date('2013-08-27').getTime(),
      2475285500: new Date('2014-05-03').getTime(),
      3034548500: new Date('2015-02-21').getTime(),
      3226318500: new Date('2015-05-26').getTime(),
      4788270500: new Date('2016-01-20').getTime(),
    },
    {
      744223985777315000: new Date('2016-06-19').getTime(),
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
      1907944148453455000: new Date('2025-04-04').getTime(),
      1917925532819425000: new Date('2025-05-01').getTime(),
      1977657953626071000: new Date('2025-10-13').getTime(),
      1996971470644563000: new Date('2025-12-06').getTime(),
    }
  ];

  // UserId から作成日時を推定
  function esitimateTimeFromId(uidStr) {
    const uid = parseFloat(uidStr);

    let dictIndex = -1;
    {
      let minDiff = Number.MAX_VALUE;
      for (let i = 0; i < USER_ID_DICT.length; i++) {
        const dict = USER_ID_DICT[i];
        const diff = Math.min(...Object.keys(dict).map(key => Math.abs(uid - parseFloat(key))));
        if (diff < minDiff) {
          minDiff = diff;
          dictIndex = i;
        }
      }
    }
    const dict = USER_ID_DICT[dictIndex];

    let nearUid0 = -1, nearDate0 = -1, nearDiff0 = Number.MAX_VALUE;
    let nearUid1 = -1, nearDate1 = -1, nearDiff1 = Number.MAX_VALUE;
    for (let key in dict) {
      const keyUid = parseFloat(key);
      const diff = Math.abs(uid - keyUid);
      if (diff < nearDiff0) {
        nearUid1 = nearUid0;
        nearDate1 = nearDate0;
        nearDiff1 = nearDiff0;
        nearUid0 = keyUid;
        nearDate0 = dict[key];
        nearDiff0 = diff;
      }
      else if (diff < nearDiff1) {
        nearUid1 = keyUid;
        nearDate1 = dict[key];
        nearDiff1 = diff;
      }
    }
    return nearDate0 + (nearDate1 - nearDate0) * (uid - nearUid0) / (nearUid1 - nearUid0);
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

  /**
   * @param {HTMLElement} elm 
   * @param {number} t 
   */
  function setAgeColor(elm, t) {
    const MONTH_MIN = 3;
    const MONTH_MAX = 6;
    let alpha = 0;
    const month = (new Date().getTime() - t) / (1000 * 86400 * (365.2425 / 12));
    if (month < MONTH_MAX) {
      alpha = Math.min(1, (MONTH_MAX - month) / (MONTH_MAX - MONTH_MIN));
      elm.style.fontWeight = 'bold';
    }
    const r = Math.min(255, 128 + Math.floor(alpha * 64));
    const g = Math.max(0, 128 - Math.floor(alpha * 128));
    const b = Math.min(255, 128 + Math.floor(alpha * 127));
    elm.style.color = `rgb(${r}, ${g}, ${b})`;
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

  let darkModeFlag = null;
  function isDarkMode() {
    if (darkModeFlag === null) {
      do {
        // 「ホーム」のボタンが白っぽいならダークモード
        const homeLink = document.querySelector('a[aria-label="ホーム"]');
        if (!homeLink) break;
        const homeText = Array.from(homeLink.querySelectorAll("span")).filter(span => span.textContent === 'ホーム')[0];
        if (!homeText) break;
        const style = window.getComputedStyle(homeText);
        const rgb = style.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!rgb) break;
        const r = parseInt(rgb[1]);
        const g = parseInt(rgb[2]);
        const b = parseInt(rgb[3]);
        const luminance = (r + g + b) / 3;
        darkModeFlag = luminance >= 128;
      } while (false);
      debugLog(`Dark mode: ${darkModeFlag}`);
    }
    return (darkModeFlag === true);
  }

  window.xsphl = new XSpamHighlighter();
  window.xsphl.start();

})();
