# X Spam Highlighter

PC 版 X のフォロワー覧でスパムの可能性があるアカウントを強調表示する UserScript です。

フォロワー欄をパァーっとスクロールしながらスクリーニングするのを助けます。

![カバー画像](./images/cover.png)

> [!WARNING]
> **強調表示されたアカウントが本当にスパムかどうかはご自身で慎重に判断ください。**
> 事前に定義されたキーワードに基づいて強調表示しているだけですので、正確でないことが多々あります。
> 特に NSFW 系や投資家は誤判定されやすいです。

## インストール方法

1. Chrome または Firefox に以下のいずれかの拡張機能をインストールします。
    - [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Firefox)
    - [Violentmonkey](https://violentmonkey.github.io/) (Firefox)
    - [Greasemonkey](https://addons.mozilla.org/ja/firefox/addon/greasemonkey/) (Firefox)
2. Chrome + Tampermonkey の場合は [デベロッパーモードを有効化](https://www.google.com/search?q=Chrome+%E3%83%87%E3%83%99%E3%83%AD%E3%83%83%E3%83%91%E3%83%BC%E3%83%A2%E3%83%BC%E3%83%89+%E6%9C%89%E5%8A%B9%E5%8C%96) します。
3. [こちらのリンク](https://github.com/shapoco/x-spam-highlighter/raw/refs/heads/main/dist/x-spam-highlighter.user.js) を開き、ユーザースクリプトをインストールします。

## 動かない場合

ページをリロードしてみてください。

別のページからフォロワー一覧へ遷移したときに動いてくれないことが多いような気がします。

## 判定基準

なんとなく以下のようなアカウントを強調表示します。

- 金配り系
- 投資系
- エロ系
- 出会い系

## おまけ機能

![](./images/ss-lock-icon.png)

### 安全なユーザをマーク

フォローボタンの上のハートマークをクリックすると、そのユーザを安全なユーザとしてマークできます。マークされたユーザは次回からスパムっぽさの評価から除外されます。

マークはブラウザに保存されます (外部へは送信されません)。

### アカウントの作成日を表示

アカウントの作成日をざっくり推定してフォローボタンの上に表示します。スパムっぽさの評価には影響しません。

### 非公開アカウントの鍵マークを強調表示

スパムっぽさの評価には影響しません。

----
