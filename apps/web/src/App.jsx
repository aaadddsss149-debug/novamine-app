// EarnX v4 - circular nav + all EARNX labels - All EARNX labels correct
import { useState, useEffect, useRef } from "react";
import EarnXAdmin from "./pages/admin/index.jsx";
import { getTelegramUser, initTelegram } from "./lib/telegram.js";
import { authenticate } from "./lib/auth.js";
import { api } from "./lib/api.js";
import { supabase } from "./lib/supabase.js";
import { miningPowerFromNova, tierFromNova, MINING, SHOP } from "@earnx/shared";
import { useTonConnectUI, useTonAddress, TonConnectButton } from "@tonconnect/ui-react";
import { beginCell } from "@ton/core";

const T = {
  bg:"#080b0f", card:"#0d1117", gold:"#55e7ff", goldDim:"#7c5cff",
  goldGlow:"rgba(85,231,255,0.18)", goldFaint:"rgba(85,231,255,0.07)",
  green:"#6dffb8", greenDim:"#176b52", text:"#f0ede6", muted:"#6b7a6b",
  red:"#ff4d4d", blue:"#4da6ff",
};

const LANGUAGES={en:{name:"English",flag:"🇬🇧",home:"Home",tasks:"Tasks",refer:"Refer",wallet:"Wallet",profile:"Profile",shop:"EarnX Shop",boost:"Boost your mining rate",refTitle:"👥 {L.refTitle}",refSub:"{L.refSub}",refReward:"💎 {L.refReward}",invited:"Invited",valid:"Valid",active:"Active",share:"Share invite",copy:"Copy invite link",copied:"Link copied",team:"Your team",pending:"Pending",noRefs:"No referrals yet",language:"Language",chooseLanguage:"Choose language",account:"Account",telegramId:"Telegram ID",status:"Status",convert:"Convert",withdraw:"Withdraw",availableTon:"Available TON",earnCredits:"EarnX credits",dailyMining:"Daily mining",monthlyMining:"Monthly mining",buy:"Buy"},ar:{name:"العربية",flag:"🇸🇦",home:"الرئيسية",tasks:"المهام",refer:"الإحالات",wallet:"المحفظة",profile:"الملف الشخصي",shop:"متجر EarnX",boost:"طوّر سرعة التعدين",refTitle:"ادعُ واربح",refSub:"ادعُ أصدقاءك واربح معًا",refReward:"أرباح الإحالات",invited:"الدعوات",valid:"الصحيحة",active:"النشطة",share:"مشاركة الدعوة",copy:"نسخ رابط الدعوة",copied:"تم نسخ الرابط",team:"فريقك",pending:"قيد الانتظار",noRefs:"لا توجد إحالات بعد",language:"اللغة",chooseLanguage:"اختر اللغة",account:"الحساب",telegramId:"معرّف تيليجرام",status:"الحالة",convert:"تحويل",withdraw:"سحب",availableTon:"رصيد TON المتاح",earnCredits:"رصيد EarnX",dailyMining:"التعدين اليومي",monthlyMining:"التعدين الشهري",buy:"شراء"},ku:{name:"کوردی",flag:"🟨",home:"سەرەکی",tasks:"ئەرکەکان",refer:"بانگهێشت",wallet:"جزدان",profile:"پرۆفایل",shop:"فرۆشگای EarnX",boost:"خێرایی کانکردن زیاد بکە",refTitle:"بانگهێشت بکە و قازانج بکە",refSub:"هاوڕێکانت بانگهێشت بکە",refReward:"قازانجی بانگهێشت",invited:"بانگهێشتکراو",valid:"دروست",active:"چالاک",share:"هاوبەشکردنی بانگهێشت",copy:"کۆپیکردنی بەستەر",copied:"بەستەر کۆپی کرا",team:"تیمەکەت",pending:"چاوەڕوان",noRefs:"هێشتا بانگهێشت نییە",language:"زمان",chooseLanguage:"زمان هەڵبژێرە",account:"هەژمار",telegramId:"ناسنامەی Telegram",status:"دۆخ",convert:"گۆڕین",withdraw:"دەرکردن",availableTon:"باڵانسی TON",earnCredits:"باڵانسی EarnX",dailyMining:"کانکردنی ڕۆژانە",monthlyMining:"کانکردنی مانگانە",buy:"کڕین"},tr:{name:"Türkçe",flag:"🇹🇷",home:"Ana Sayfa",tasks:"Görevler",refer:"Davet",wallet:"Cüzdan",profile:"Profil",shop:"EarnX Mağaza",boost:"Madencilik hızını artır",refTitle:"Davet et ve kazan",refSub:"Arkadaşlarını davet et",refReward:"Davet kazancı",invited:"Davet",valid:"Geçerli",active:"Aktif",share:"Davet paylaş",copy:"Davet bağlantısını kopyala",copied:"Bağlantı kopyalandı",team:"Ekibin",pending:"Bekliyor",noRefs:"Henüz davet yok",language:"Dil",chooseLanguage:"Dil seç",account:"Hesap",telegramId:"Telegram ID",status:"Durum",convert:"Dönüştür",withdraw:"Çek",availableTon:"Kullanılabilir TON",earnCredits:"EarnX bakiyesi",dailyMining:"Günlük madencilik",monthlyMining:"Aylık madencilik",buy:"Satın al"},fa:{name:"فارسی",flag:"🇮🇷",home:"خانه",tasks:"وظایف",refer:"دعوت",wallet:"کیف پول",profile:"پروفایل",shop:"فروشگاه EarnX",boost:"سرعت استخراج",refTitle:"دعوت کن و درآمد بگیر",refSub:"دوستانت را دعوت کن",refReward:"درآمد دعوت",invited:"دعوت‌شده",valid:"معتبر",active:"فعال",share:"اشتراک دعوت",copy:"کپی لینک دعوت",copied:"لینک کپی شد",team:"تیم شما",pending:"در انتظار",noRefs:"هنوز دعوتی نیست",language:"زبان",chooseLanguage:"انتخاب زبان",account:"حساب",telegramId:"شناسه تلگرام",status:"وضعیت",convert:"تبدیل",withdraw:"برداشت",availableTon:"موجودی TON",earnCredits:"موجودی EarnX",dailyMining:"استخراج روزانه",monthlyMining:"استخراج ماهانه",buy:"خرید"},es:{name:"Español",flag:"🇪🇸",home:"Inicio",tasks:"Tareas",refer:"Referidos",wallet:"Billetera",profile:"Perfil",shop:"Tienda EarnX",boost:"Aumenta tu minería",refTitle:"Invita y gana",refSub:"Invita a tus amigos",refReward:"Ganancias por referidos",invited:"Invitados",valid:"Válidos",active:"Activos",share:"Compartir invitación",copy:"Copiar enlace",copied:"Enlace copiado",team:"Tu equipo",pending:"Pendiente",noRefs:"Aún no hay referidos",language:"Idioma",chooseLanguage:"Elegir idioma",account:"Cuenta",telegramId:"ID de Telegram",status:"Estado",convert:"Convertir",withdraw:"Retirar",availableTon:"TON disponible",earnCredits:"Saldo EarnX",dailyMining:"Minería diaria",monthlyMining:"Minería mensual",buy:"Comprar"},fr:{name:"Français",flag:"🇫🇷",home:"Accueil",tasks:"Tâches",refer:"Parrainage",wallet:"Portefeuille",profile:"Profil",shop:"Boutique EarnX",boost:"Augmentez votre minage",refTitle:"Invitez et gagnez",refSub:"Invitez vos amis",refReward:"Gains de parrainage",invited:"Invités",valid:"Valides",active:"Actifs",share:"Partager",copy:"Copier le lien",copied:"Lien copié",team:"Votre équipe",pending:"En attente",noRefs:"Aucun filleul",language:"Langue",chooseLanguage:"Choisir la langue",account:"Compte",telegramId:"ID Telegram",status:"Statut",convert:"Convertir",withdraw:"Retirer",availableTon:"TON disponible",earnCredits:"Solde EarnX",dailyMining:"Minage quotidien",monthlyMining:"Minage mensuel",buy:"Acheter"},de:{name:"Deutsch",flag:"🇩🇪",home:"Startseite",tasks:"Aufgaben",refer:"Empfehlen",wallet:"Wallet",profile:"Profil",shop:"EarnX Shop",boost:"Mining steigern",refTitle:"Einladen & verdienen",refSub:"Freunde einladen",refReward:"Empfehlungsverdienst",invited:"Eingeladen",valid:"Gültig",active:"Aktiv",share:"Einladung teilen",copy:"Link kopieren",copied:"Link kopiert",team:"Dein Team",pending:"Ausstehend",noRefs:"Noch keine Empfehlungen",language:"Sprache",chooseLanguage:"Sprache wählen",account:"Konto",telegramId:"Telegram-ID",status:"Status",convert:"Konvertieren",withdraw:"Auszahlen",availableTon:"Verfügbares TON",earnCredits:"EarnX Guthaben",dailyMining:"Tägliches Mining",monthlyMining:"Monatliches Mining",buy:"Kaufen"},ru:{name:"Русский",flag:"🇷🇺",home:"Главная",tasks:"Задания",refer:"Рефералы",wallet:"Кошелёк",profile:"Профиль",shop:"Магазин EarnX",boost:"Увеличьте майнинг",refTitle:"Приглашай и зарабатывай",refSub:"Приглашайте друзей",refReward:"Доход с рефералов",invited:"Приглашено",valid:"Активных",active:"Активные",share:"Поделиться",copy:"Копировать ссылку",copied:"Ссылка скопирована",team:"Ваша команда",pending:"Ожидание",noRefs:"Пока нет рефералов",language:"Язык",chooseLanguage:"Выберите язык",account:"Аккаунт",telegramId:"ID Telegram",status:"Статус",convert:"Конвертировать",withdraw:"Вывести",availableTon:"Доступно TON",earnCredits:"Баланс EarnX",dailyMining:"Доход в день",monthlyMining:"Доход в месяц",buy:"Купить"},pt:{name:"Português",flag:"🇵🇹",home:"Início",tasks:"Tarefas",refer:"Indicar",wallet:"Carteira",profile:"Perfil",shop:"Loja EarnX",boost:"Aumente sua mineração",refTitle:"Convide e ganhe",refSub:"Convide seus amigos",refReward:"Ganhos de indicação",invited:"Convidados",valid:"Válidos",active:"Ativos",share:"Compartilhar",copy:"Copiar link",copied:"Link copiado",team:"Sua equipe",pending:"Pendente",noRefs:"Nenhuma indicação",language:"Idioma",chooseLanguage:"Escolher idioma",account:"Conta",telegramId:"ID do Telegram",status:"Status",convert:"Converter",withdraw:"Sacar",availableTon:"TON disponível",earnCredits:"Saldo EarnX",dailyMining:"Mineração diária",monthlyMining:"Mineração mensal",buy:"Comprar"},zh:{name:"中文",flag:"🇨🇳",home:"首页",tasks:"任务",refer:"邀请",wallet:"钱包",profile:"个人资料",shop:"EarnX 商店",boost:"提升挖矿速度",refTitle:"邀请并赚取",refSub:"邀请好友一起赚取",refReward:"邀请收益",invited:"已邀请",valid:"有效",active:"活跃",share:"分享邀请",copy:"复制邀请链接",copied:"链接已复制",team:"你的团队",pending:"待定",noRefs:"暂无邀请",language:"语言",chooseLanguage:"选择语言",account:"账户",telegramId:"Telegram ID",status:"状态",convert:"兑换",withdraw:"提现",availableTon:"可用 TON",earnCredits:"EarnX 余额",dailyMining:"每日挖矿",monthlyMining:"每月挖矿",buy:"购买"},ja:{name:"日本語",flag:"🇯🇵",home:"ホーム",tasks:"タスク",refer:"紹介",wallet:"ウォレット",profile:"プロフィール",shop:"EarnX ショップ",boost:"マイニング速度を強化",refTitle:"招待して稼ぐ",refSub:"友達を招待しましょう",refReward:"紹介報酬",invited:"招待",valid:"有効",active:"アクティブ",share:"招待を共有",copy:"招待リンクをコピー",copied:"リンクをコピーしました",team:"あなたのチーム",pending:"保留",noRefs:"紹介はまだありません",language:"言語",chooseLanguage:"言語を選択",account:"アカウント",telegramId:"Telegram ID",status:"ステータス",convert:"交換",withdraw:"出金",availableTon:"利用可能 TON",earnCredits:"EarnX残高",dailyMining:"1日のマイニング",monthlyMining:"月間マイニング",buy:"購入"},ko:{name:"한국어",flag:"🇰🇷",home:"홈",tasks:"작업",refer:"추천",wallet:"지갑",profile:"프로필",shop:"EarnX 상점",boost:"채굴 속도 향상",refTitle:"초대하고 보상받기",refSub:"친구를 초대하세요",refReward:"추천 수익",invited:"초대",valid:"유효",active:"활성",share:"초대 공유",copy:"초대 링크 복사",copied:"링크가 복사되었습니다",team:"내 팀",pending:"대기 중",noRefs:"추천이 없습니다",language:"언어",chooseLanguage:"언어 선택",account:"계정",telegramId:"텔레그램 ID",status:"상태",convert:"변환",withdraw:"출금",availableTon:"사용 가능한 TON",earnCredits:"EarnX 잔액",dailyMining:"일일 채굴",monthlyMining:"월간 채굴",buy:"구매"},hi:{name:"हिन्दी",flag:"🇮🇳",home:"होम",tasks:"कार्य",refer:"रेफरल",wallet:"वॉलेट",profile:"प्रोफ़ाइल",shop:"EarnX स्टोर",boost:"माइनिंग बढ़ाएँ",refTitle:"आमंत्रित करें और कमाएँ",refSub:"दोस्तों को आमंत्रित करें",refReward:"रेफरल कमाई",invited:"आमंत्रित",valid:"मान्य",active:"सक्रिय",share:"आमंत्रण साझा करें",copy:"लिंक कॉपी करें",copied:"लिंक कॉपी हुआ",team:"आपकी टीम",pending:"लंबित",noRefs:"अभी कोई रेफरल नहीं",language:"भाषा",chooseLanguage:"भाषा चुनें",account:"खाता",telegramId:"Telegram ID",status:"स्थिति",convert:"कन्वर्ट",withdraw:"निकासी",availableTon:"उपलब्ध TON",earnCredits:"EarnX बैलेंस",dailyMining:"दैनिक माइनिंग",monthlyMining:"मासिक माइनिंग",buy:"खरीदें"},ur:{name:"اردو",flag:"🇵🇰",home:"ہوم",tasks:"کام",refer:"ریفرل",wallet:"والیٹ",profile:"پروفائل",shop:"EarnX اسٹور",boost:"مائننگ بڑھائیں",refTitle:"دعوت دیں اور کمائیں",refSub:"دوستوں کو دعوت دیں",refReward:"ریفرل کمائی",invited:"مدعو",valid:"درست",active:"فعال",share:"دعوت شیئر کریں",copy:"لنک کاپی کریں",copied:"لنک کاپی ہوگیا",team:"آپ کی ٹیم",pending:"زیر التوا",noRefs:"ابھی کوئی ریفرل نہیں",language:"زبان",chooseLanguage:"زبان منتخب کریں",account:"اکاؤنٹ",telegramId:"ٹیلیگرام ID",status:"حالت",convert:"تبدیل",withdraw:"رقم نکالیں",availableTon:"دستیاب TON",earnCredits:"EarnX بیلنس",dailyMining:"روزانہ مائننگ",monthlyMining:"ماہانہ مائننگ",buy:"خریدیں"}};

const HOME_COPY={
  en:{welcome:"Welcome back",totalBalance:"Total balance",earnxCredits:"EARNX credits",referrals:"Referrals",miningCenter:"Mining center",earnEvery:"Earn every 24 hours",balance:"EARNX BALANCE",credits:"credits",energy:"ENERGY",miningEnergy:"mining energy",tonBalance:"TON BALANCE",miningPower:"MINING POWER",power:"power",nextReward:"NEXT MINING REWARD",session:"24h session",start:"Start earning",progress:"Mining in progress",collect:"Collect reward",accumulated:"Accumulated",perSession:"per session",earnMore:"Earn more",tasksRewards:"Tasks & rewards",invite:"Invite friends",buildTeam:"Build your team",welcomeGift:"Welcome gift",claimBonus:"Claim your bonus"},
  ar:{welcome:"مرحبًا بعودتك",totalBalance:"إجمالي الرصيد",earnxCredits:"رصيد EARNX",referrals:"الإحالات",miningCenter:"مركز التعدين",earnEvery:"اكسب كل 24 ساعة",balance:"رصيد EARNX",credits:"وحدات",energy:"الطاقة",miningEnergy:"طاقة التعدين",tonBalance:"رصيد TON",miningPower:"قوة التعدين",power:"القوة",nextReward:"مكافأة التعدين القادمة",session:"جلسة 24 ساعة",start:"ابدأ التعدين",progress:"التعدين جارٍ",collect:"استلام المكافأة",accumulated:"المجموع المكتسب",perSession:"لكل جلسة",earnMore:"اربح أكثر",tasksRewards:"المهمات والمكافآت",invite:"ادعُ أصدقاءك",buildTeam:"كوّن فريقك",welcomeGift:"هدية الترحيب",claimBonus:"استلم مكافأتك"},
  ku:{welcome:"بەخێربێیتەوە",totalBalance:"کۆی باڵانس",earnxCredits:"باڵانسی EARNX",referrals:"بانگهێشتەکان",miningCenter:"ناوەندی کانکردن",earnEvery:"هەر ٢٤ کاتژمێر قازانج بکە",balance:"باڵانسی EARNX",credits:"یەکە",energy:"وزە",miningEnergy:"وزەی کانکردن",tonBalance:"باڵانسی TON",miningPower:"هێزی کانکردن",power:"هێز",nextReward:"خەڵاتی داهاتووی کانکردن",session:"دانیشتنی ٢٤ کاتژمێر",start:"دەست بە کانکردن بکە",progress:"کانکردن بەردەوامە",collect:"خەڵات وەربگرە",accumulated:"کۆی بەدەستهاتوو",perSession:"بۆ هەر دانیشتنێک",earnMore:"زیاتر قازانج بکە",tasksRewards:"ئەرک و خەڵاتەکان",invite:"هاوڕێکانت بانگهێشت بکە",buildTeam:"تیمەکەت دروست بکە",welcomeGift:"دیاریی بەخێرهاتن",claimBonus:"خەڵاتەکەت وەربگرە"},
  tr:{welcome:"Tekrar hoş geldin",totalBalance:"Toplam bakiye",earnxCredits:"EARNX bakiyesi",referrals:"Davetler",miningCenter:"Madencilik merkezi",earnEvery:"Her 24 saatte kazan",balance:"EARNX BAKİYESİ",credits:"kredi",energy:"ENERJİ",miningEnergy:"madencilik enerjisi",tonBalance:"TON BAKİYESİ",miningPower:"MADENCİLİK GÜCÜ",power:"güç",nextReward:"SONRAKİ MADENCİLİK ÖDÜLÜ",session:"24 saatlik oturum",start:"Madenciliği başlat",progress:"Madencilik devam ediyor",collect:"Ödülü al",accumulated:"Birikmiş",perSession:"oturum başına",earnMore:"Daha fazla kazan",tasksRewards:"Görevler ve ödüller",invite:"Arkadaşlarını davet et",buildTeam:"Ekibini oluştur",welcomeGift:"Hoş geldin hediyesi",claimBonus:"Bonusunu al"},
  fa:{welcome:"خوش برگشتی",totalBalance:"موجودی کل",earnxCredits:"موجودی EARNX",referrals:"معرفی‌ها",miningCenter:"مرکز استخراج",earnEvery:"هر ۲۴ ساعت درآمد کسب کنید",balance:"موجودی EARNX",credits:"اعتبار",energy:"انرژی",miningEnergy:"انرژی استخراج",tonBalance:"موجودی TON",miningPower:"قدرت استخراج",power:"قدرت",nextReward:"پاداش استخراج بعدی",session:"جلسه ۲۴ ساعته",start:"شروع استخراج",progress:"استخراج در حال انجام است",collect:"دریافت پاداش",accumulated:"جمع شده",perSession:"در هر جلسه",earnMore:"بیشتر کسب کنید",tasksRewards:"وظایف و پاداش‌ها",invite:"دوستان را دعوت کنید",buildTeam:"تیم خود را بسازید",welcomeGift:"هدیه خوش‌آمدگویی",claimBonus:"پاداش را دریافت کنید"},
  es:{welcome:"Bienvenido de nuevo",totalBalance:"Saldo total",earnxCredits:"Saldo EARNX",referrals:"Referidos",miningCenter:"Centro de minería",earnEvery:"Gana cada 24 horas",balance:"SALDO EARNX",credits:"créditos",energy:"ENERGÍA",miningEnergy:"energía de minería",tonBalance:"SALDO TON",miningPower:"POTENCIA DE MINERÍA",power:"potencia",nextReward:"PRÓXIMA RECOMPENSA",session:"sesión de 24 h",start:"Empezar a minar",progress:"Minería en curso",collect:"Cobrar recompensa",accumulated:"Acumulado",perSession:"por sesión",earnMore:"Gana más",tasksRewards:"Tareas y recompensas",invite:"Invitar amigos",buildTeam:"Crea tu equipo",welcomeGift:"Regalo de bienvenida",claimBonus:"Reclamar bono"},
  fr:{welcome:"Bon retour",totalBalance:"Solde total",earnxCredits:"Solde EARNX",referrals:"Parrainages",miningCenter:"Centre de minage",earnEvery:"Gagnez toutes les 24 heures",balance:"SOLDE EARNX",credits:"crédits",energy:"ÉNERGIE",miningEnergy:"énergie de minage",tonBalance:"SOLDE TON",miningPower:"PUISSANCE DE MINAGE",power:"puissance",nextReward:"PROCHAINE RÉCOMPENSE",session:"session de 24 h",start:"Commencer le minage",progress:"Minage en cours",collect:"Collecter la récompense",accumulated:"Cumulé",perSession:"par session",earnMore:"Gagner plus",tasksRewards:"Tâches et récompenses",invite:"Inviter des amis",buildTeam:"Créer votre équipe",welcomeGift:"Cadeau de bienvenue",claimBonus:"Réclamer le bonus"},
  de:{welcome:"Willkommen zurück",totalBalance:"Gesamtsaldo",earnxCredits:"EARNX-Guthaben",referrals:"Empfehlungen",miningCenter:"Mining-Zentrum",earnEvery:"Alle 24 Stunden verdienen",balance:"EARNX-GUTHABEN",credits:"Credits",energy:"ENERGIE",miningEnergy:"Mining-Energie",tonBalance:"TON-GUTHABEN",miningPower:"MINING-POWER",power:"Power",nextReward:"NÄCHSTE MINING-BELohnung",session:"24-Stunden-Sitzung",start:"Mining starten",progress:"Mining läuft",collect:"Belohnung sammeln",accumulated:"Gesammelt",perSession:"pro Sitzung",earnMore:"Mehr verdienen",tasksRewards:"Aufgaben & Belohnungen",invite:"Freunde einladen",buildTeam:"Team aufbauen",welcomeGift:"Willkommensgeschenk",claimBonus:"Bonus erhalten"},
  ru:{welcome:"С возвращением",totalBalance:"Общий баланс",earnxCredits:"Баланс EARNX",referrals:"Рефералы",miningCenter:"Центр майнинга",earnEvery:"Зарабатывайте каждые 24 часа",balance:"БАЛАНС EARNX",credits:"кредиты",energy:"ЭНЕРГИЯ",miningEnergy:"энергия майнинга",tonBalance:"БАЛАНС TON",miningPower:"МОЩНОСТЬ МАЙНИНГА",power:"мощность",nextReward:"СЛЕДУЮЩАЯ НАГРАДА",session:"сессия 24 часа",start:"Начать майнинг",progress:"Майнинг идёт",collect:"Забрать награду",accumulated:"Накоплено",perSession:"за сессию",earnMore:"Заработать больше",tasksRewards:"Задания и награды",invite:"Пригласить друзей",buildTeam:"Создать команду",welcomeGift:"Подарок за приветствие",claimBonus:"Забрать бонус"},
  pt:{welcome:"Bem-vindo de volta",totalBalance:"Saldo total",earnxCredits:"Saldo EARNX",referrals:"Indicações",miningCenter:"Central de mineração",earnEvery:"Ganhe a cada 24 horas",balance:"SALDO EARNX",credits:"créditos",energy:"ENERGIA",miningEnergy:"energia de mineração",tonBalance:"SALDO TON",miningPower:"PODER DE MINERAÇÃO",power:"poder",nextReward:"PRÓXIMA RECOMPENSA",session:"sessão de 24 h",start:"Começar mineração",progress:"Mineração em andamento",collect:"Coletar recompensa",accumulated:"Acumulado",perSession:"por sessão",earnMore:"Ganhe mais",tasksRewards:"Tarefas e recompensas",invite:"Convidar amigos",buildTeam:"Crie sua equipe",welcomeGift:"Presente de boas-vindas",claimBonus:"Resgatar bônus"},
  zh:{welcome:"欢迎回来",totalBalance:"总余额",earnxCredits:"EARNX余额",referrals:"邀请",miningCenter:"挖矿中心",earnEvery:"每24小时获得收益",balance:"EARNX余额",credits:"积分",energy:"能量",miningEnergy:"挖矿能量",tonBalance:"TON余额",miningPower:"挖矿算力",power:"算力",nextReward:"下一次挖矿奖励",session:"24小时会话",start:"开始挖矿",progress:"挖矿进行中",collect:"领取奖励",accumulated:"已累计",perSession:"每次会话",earnMore:"赚取更多",tasksRewards:"任务与奖励",invite:"邀请好友",buildTeam:"建立团队",welcomeGift:"欢迎礼物",claimBonus:"领取奖励"},
  ja:{welcome:"おかえりなさい",totalBalance:"総残高",earnxCredits:"EARNX残高",referrals:"紹介",miningCenter:"マイニングセンター",earnEvery:"24時間ごとに獲得",balance:"EARNX残高",credits:"クレジット",energy:"エネルギー",miningEnergy:"マイニングエネルギー",tonBalance:"TON残高",miningPower:"マイニングパワー",power:"パワー",nextReward:"次のマイニング報酬",session:"24時間セッション",start:"マイニング開始",progress:"マイニング中",collect:"報酬を受け取る",accumulated:"累計",perSession:"セッションごと",earnMore:"もっと稼ぐ",tasksRewards:"タスクと報酬",invite:"友達を招待",buildTeam:"チームを作る",welcomeGift:"ウェルカムギフト",claimBonus:"ボーナスを受け取る"},
  ko:{welcome:"다시 오신 것을 환영합니다",totalBalance:"총 잔액",earnxCredits:"EARNX 잔액",referrals:"추천",miningCenter:"채굴 센터",earnEvery:"24시간마다 수익",balance:"EARNX 잔액",credits:"크레딧",energy:"에너지",miningEnergy:"채굴 에너지",tonBalance:"TON 잔액",miningPower:"채굴 파워",power:"파워",nextReward:"다음 채굴 보상",session:"24시간 세션",start:"채굴 시작",progress:"채굴 진행 중",collect:"보상 받기",accumulated:"누적",perSession:"세션당",earnMore:"더 벌기",tasksRewards:"작업 및 보상",invite:"친구 초대",buildTeam:"팀 만들기",welcomeGift:"환영 선물",claimBonus:"보너스 받기"},
  hi:{welcome:"वापसी पर स्वागत है",totalBalance:"कुल बैलेंस",earnxCredits:"EARNX बैलेंस",referrals:"रेफरल",miningCenter:"माइनिंग सेंटर",earnEvery:"हर 24 घंटे कमाएँ",balance:"EARNX बैलेंस",credits:"क्रेडिट",energy:"ऊर्जा",miningEnergy:"माइनिंग ऊर्जा",tonBalance:"TON बैलेंस",miningPower:"माइनिंग पावर",power:"पावर",nextReward:"अगला माइनिंग रिवॉर्ड",session:"24 घंटे का सत्र",start:"माइनिंग शुरू करें",progress:"माइनिंग जारी है",collect:"रिवॉर्ड लें",accumulated:"जमा",perSession:"प्रति सत्र",earnMore:"और कमाएँ",tasksRewards:"कार्य और रिवॉर्ड",invite:"दोस्तों को आमंत्रित करें",buildTeam:"अपनी टीम बनाएँ",welcomeGift:"स्वागत उपहार",claimBonus:"बोनस लें"},
  ur:{welcome:"واپس خوش آمدید",totalBalance:"کل بیلنس",earnxCredits:"EARNX بیلنس",referrals:"ریفرلز",miningCenter:"مائننگ سینٹر",earnEvery:"ہر 24 گھنٹے کمائیں",balance:"EARNX بیلنس",credits:"کریڈٹس",energy:"توانائی",miningEnergy:"مائننگ توانائی",tonBalance:"TON بیلنس",miningPower:"مائننگ پاور",power:"پاور",nextReward:"اگلا مائننگ انعام",session:"24 گھنٹے کا سیشن",start:"مائننگ شروع کریں",progress:"مائننگ جاری ہے",collect:"انعام حاصل کریں",accumulated:"جمع شدہ",perSession:"فی سیشن",earnMore:"مزید کمائیں",tasksRewards:"کام اور انعامات",invite:"دوستوں کو مدعو کریں",buildTeam:"اپنی ٹیم بنائیں",welcomeGift:"خوش آمدید تحفہ",claimBonus:"بونس حاصل کریں"}
};
const TASK_COPY={
  en:{title:"Tasks",sub:"Complete tasks and watch ads to earn EARNX",loading:"Loading tasks…",empty:"No tasks available right now.",done:"Done",watch:"Watch",open:"Open",completed:"Task completed! +",refMilestones:"Referral milestones",completedLabel:"Completed",locked:"Locked"},
  ar:{title:"المهمات",sub:"أكمل المهمات وشاهد الإعلانات لكسب EARNX",loading:"جارٍ تحميل المهمات…",empty:"لا توجد مهمات متاحة الآن.",done:"تم",watch:"مشاهدة",open:"فتح",completed:"تم إكمال المهمة! +",refMilestones:"مراحل الإحالات",completedLabel:"مكتمل",locked:"مقفل"},
  ku:{title:"ئەرکەکان",sub:"ئەرکەکان تەواو بکە و ڕیکلام ببینە بۆ EARNX",loading:"ئەرکەکان بار دەکرێن…",empty:"ئێستا هیچ ئەرکێک بەردەست نییە.",done:"تەواو",watch:"بینین",open:"کردنەوە",completed:"ئەرک تەواو بوو! +",refMilestones:"قۆناغەکانی بانگهێشت",completedLabel:"تەواو",locked:"داخراو"},
  tr:{title:"Görevler",sub:"Görevleri tamamla ve reklam izleyerek EARNX kazan",loading:"Görevler yükleniyor…",empty:"Şu anda görev yok.",done:"Tamam",watch:"İzle",open:"Aç",completed:"Görev tamamlandı! +",refMilestones:"Davet hedefleri",completedLabel:"Tamamlandı",locked:"Kilitli"},
  fa:{title:"وظایف",sub:"وظایف را انجام دهید و با دیدن تبلیغات EARNX بگیرید",loading:"در حال بارگذاری…",empty:"فعلاً وظیفه‌ای وجود ندارد.",done:"انجام شد",watch:"مشاهده",open:"باز کردن",completed:"وظیفه انجام شد! +",refMilestones:"مراحل دعوت",completedLabel:"تکمیل",locked:"قفل"},
  es:{title:"Tareas",sub:"Completa tareas y mira anuncios para ganar EARNX",loading:"Cargando tareas…",empty:"No hay tareas disponibles.",done:"Hecho",watch:"Ver",open:"Abrir",completed:"¡Tarea completada! +",refMilestones:"Metas de referidos",completedLabel:"Completado",locked:"Bloqueado"},
  fr:{title:"Tâches",sub:"Accomplissez des tâches et regardez des pubs pour gagner des EARNX",loading:"Chargement…",empty:"Aucune tâche disponible.",done:"Terminé",watch:"Voir",open:"Ouvrir",completed:"Tâche terminée ! +",refMilestones:"Objectifs de parrainage",completedLabel:"Terminé",locked:"Verrouillé"},
  de:{title:"Aufgaben",sub:"Aufgaben erledigen und Werbung ansehen, um EARNX zu verdienen",loading:"Aufgaben werden geladen…",empty:"Keine Aufgaben verfügbar.",done:"Fertig",watch:"Ansehen",open:"Öffnen",completed:"Aufgabe erledigt! +",refMilestones:"Empfehlungsziele",completedLabel:"Erledigt",locked:"Gesperrt"},
  ru:{title:"Задания",sub:"Выполняйте задания и смотрите рекламу, чтобы получать EARNX",loading:"Загрузка заданий…",empty:"Сейчас заданий нет.",done:"Готово",watch:"Смотреть",open:"Открыть",completed:"Задание выполнено! +",refMilestones:"Цели рефералов",completedLabel:"Выполнено",locked:"Закрыто"},
  pt:{title:"Tarefas",sub:"Conclua tarefas e assista anúncios para ganhar EARNX",loading:"Carregando…",empty:"Nenhuma tarefa disponível.",done:"Concluído",watch:"Assistir",open:"Abrir",completed:"Tarefa concluída! +",refMilestones:"Metas de indicação",completedLabel:"Concluído",locked:"Bloqueado"},
  zh:{title:"任务",sub:"完成任务并观看广告赚取 EARNX",loading:"正在加载任务…",empty:"暂无可用任务。",done:"完成",watch:"观看",open:"打开",completed:"任务完成！+",refMilestones:"邀请里程碑",completedLabel:"已完成",locked:"已锁定"},
  ja:{title:"タスク",sub:"タスクを完了して広告を見てEARNXを獲得",loading:"読み込み中…",empty:"現在利用できるタスクはありません。",done:"完了",watch:"視聴",open:"開く",completed:"タスク完了！+",refMilestones:"紹介マイルストーン",completedLabel:"完了",locked:"ロック中"},
  ko:{title:"작업",sub:"작업을 완료하고 광고를 시청하여 EARNX를 받으세요",loading:"작업을 불러오는 중…",empty:"현재 작업이 없습니다.",done:"완료",watch:"시청",open:"열기",completed:"작업 완료! +",refMilestones:"추천 마일스톤",completedLabel:"완료",locked:"잠김"},
  hi:{title:"कार्य",sub:"कार्य पूरा करें और विज्ञापन देखकर EARNX कमाएँ",loading:"कार्य लोड हो रहे हैं…",empty:"अभी कोई कार्य उपलब्ध नहीं है।",done:"पूरा",watch:"देखें",open:"खोलें",completed:"कार्य पूरा हुआ! +",refMilestones:"रेफरल लक्ष्य",completedLabel:"पूरा",locked:"लॉक"},
  ur:{title:"کام",sub:"کام مکمل کریں اور اشتہارات دیکھ کر EARNX کمائیں",loading:"کام لوڈ ہو رہے ہیں…",empty:"ابھی کوئی کام دستیاب نہیں۔",done:"مکمل",watch:"دیکھیں",open:"کھولیں",completed:"کام مکمل ہوگیا! +",refMilestones:"ریفرل اہداف",completedLabel:"مکمل",locked:"مقفل"}
};
const ALL_USERS = [
  "MikeCarterX","JoaoSilva99","EmilyJOfficial","SantosGabriel_","AshleyWave",
  "LucasOliveira7","DanielB_Pro","RafaCostaX","JessicaMLive","BrunoFps",
  "ChrisDZone","MatheusPlayz","AmandaGlow","FelipeRider","BrandonElite",
  "ThiagoVibes","SamTaylorXO","PedroLegend","RyanAces","VictorRush",
  "OliviaDreams","CaioStorm","EthanPrime","HenriqueYT","ChloeMagic",
  "AndreFlex","NathanVolt","EduardoKing","MadisonStar","LeoMeloX",
  "JustinNova","VinnyPereira","SophiaLux","DiegoMotion","TylerSync",
  "MarceloWave","IsabellaSky","GustavoFire","KevinRise","RicardoFlow"
];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#080b0f;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:#080b0f;}
  ::-webkit-scrollbar-thumb{background:#7c5cff;border-radius:2px;}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(85,231,255,0.18)}50%{box-shadow:0 0 32px rgba(245,200,66,0.4)}}
  @keyframes slideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
  @keyframes reelSpin{0%{transform:translateY(-6px)}50%{transform:translateY(6px)}100%{transform:translateY(-6px)}}
  @keyframes float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-6px)}}
  @keyframes float{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-12px) rotate(5deg)}}
  @keyframes particle{0%{transform:scale(1);opacity:1}100%{transform:scale(0) translate(20px,-40px);opacity:0}}
  @keyframes popIn{0%{transform:scale(0.6);opacity:0}80%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes activitySlide{from{transform:translateY(-40px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  @keyframes swapPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
  .nav-btn{transition:all 0.2s;}
  .btn-gold{transition:all 0.2s;}
  .btn-gold:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.1);}
  .card-hover{transition:all 0.25s;cursor:pointer;}
  .card-hover:hover{transform:translateY(-2px);border-color:#7c5cff !important;box-shadow:0 8px 32px rgba(85,231,255,0.18) !important;}
  .activity-item{animation:activitySlide 0.4s ease;}
  .prize-card{transition:all 0.15s;}
  .prize-card:hover{transform:scale(1.04);}
  .shimmer-btn{background:linear-gradient(90deg,#55e7ff 0%,#fff8d6 40%,#55e7ff 60%,#7c5cff 100%);background-size:200% 100%;animation:shimmer 2s linear infinite;}
  .swap-card{animation:swapPulse 2s ease-in-out infinite;}
  @keyframes adProgress{from{width:0%}to{width:100%}}
  @keyframes adFadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
  @keyframes adSkipPulse{0%,100%{box-shadow:0 0 0 0 rgba(245,200,66,0.4)}50%{box-shadow:0 0 0 8px rgba(245,200,66,0)}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes ringPulse{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}
`;

function Icon({name,size=20}) {
  const icons = {
    zap:"⚡", swap:"↔", check:"✓", lock:"🔒", info:"ⓘ",
    share:"↗", copy:"⧉", users:"👥", cpu:"◉", wallet:"◈",
    home:"⌂", tasks:"☷", team:"♟", rank:"♛", power:"⚡",
    mining:"⛏", settings:"⚙", gift:"🎁", star:"★", arrow:"→"
  };
  return (
    <span
      aria-hidden="true"
      style={{
        display:"inline-flex",
        width:size,
        height:size,
        alignItems:"center",
        justifyContent:"center",
        fontSize:Math.max(11, Math.round(size*0.8)),
        lineHeight:1,
        fontFamily:"Arial, sans-serif",
        flexShrink:0
      }}
    >
      {icons[name] || "•"}
    </span>
  );
}

let actIdx=0;
function genActivity(){
  const u=ALL_USERS[actIdx%ALL_USERS.length]; actIdx++;
  const types=[
    {icon:"⛏️",color:T.green, text:`${u} mined`,   value:`+${(Math.random()*0.002+0.0001).toFixed(6)} TON`},
    {icon:"💰",color:T.gold,  text:`${u} withdrew`, value:`${(Math.random()*2+0.8).toFixed(2)} TON`},
    {icon:"⚡",color:T.blue,  text:`${u} bought`,   value:`${["100K","500K","1.25M"][Math.floor(Math.random()*3)]} EARNX`},
    {icon:"🚀",color:"#c084fc",text:`${u} invited`,  value:`a new member`},
  ];
  return {...types[Math.floor(Math.random()*types.length)],time:"just now",id:Date.now()+Math.random()};
}

function SwapModal({onClose,hashes,onSwapComplete}){
  const [amount,setAmount]=useState("");
  const [swapping,setSwapping]=useState(false);
  const [swapError,setSwapError]=useState(null);
  const rate=0.00001440;
  const tonOut=amount?(parseFloat(amount)*rate).toFixed(8):"0.00000000";
  async function handleConfirmSwap(){
    const amountNum=parseFloat(amount);
    if(!amountNum||amountNum<=0)return;
    if(amountNum>hashes){setSwapError("Amount exceeds your available hashes.");return;}
    setSwapping(true);setSwapError(null);
    try{const result=await api.swap(amountNum);if(onSwapComplete)onSwapComplete(result);onClose();}
    catch(e){setSwapError(e?.message||"Swap failed. Please try again.");}
    finally{setSwapping(false);}
  }
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.goldDim}`,borderRadius:"24px 24px 0 0",padding:24,width:"100%",maxWidth:430,animation:"slideUp 0.3s ease",boxShadow:`0 -8px 40px ${T.goldGlow}`}}>
        <div style={{width:40,height:4,background:"#2a2a2a",borderRadius:2,margin:"0 auto 20px"}}/>
        <div style={{fontFamily:"'Orbitron'",fontWeight:700,fontSize:18,color:T.gold,marginBottom:4}}>SWAP ENERGY → TON</div>
        <div style={{fontSize:13,color:T.muted,marginBottom:20}}>Convert your mined energy to TON</div>
        <div style={{background:T.goldFaint,border:`1px solid ${T.goldDim}`,borderRadius:12,padding:14,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:12,color:T.muted}}>Exchange Rate</div>
          <div style={{fontFamily:"'Orbitron'",fontSize:12,color:T.gold,fontWeight:700}}>1 EARNX = {rate} TON</div>
        </div>
        <div style={{background:"rgba(0,0,0,0.4)",border:"1px solid #1e2a1e",borderRadius:12,padding:14,marginBottom:8}}>
          <div style={{fontSize:11,color:T.muted,marginBottom:6,letterSpacing:1}}>FROM (EARNX)</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="number" placeholder="0.00" value={amount} onChange={e=>{setAmount(e.target.value);setSwapError(null);}} style={{flex:1,background:"transparent",border:"none",outline:"none",fontFamily:"'Orbitron'",fontSize:22,fontWeight:700,color:T.text,width:"100%"}}/>
            <button onClick={()=>setAmount(hashes.toFixed(8))} style={{background:T.goldFaint,border:`1px solid ${T.goldDim}`,borderRadius:8,padding:"4px 10px",color:T.gold,fontSize:11,cursor:"pointer",fontFamily:"'Rajdhani'",fontWeight:700}}>MAX</button>
          </div>
          <div style={{fontSize:11,color:T.muted,marginTop:4}}>Available: {hashes.toFixed(8)} EARNX</div>
        </div>
        <div style={{textAlign:"center",color:T.gold,marginBottom:8}}>↕</div>
        <div style={{background:"rgba(57,255,138,0.05)",border:`1px solid ${T.greenDim}`,borderRadius:12,padding:14,marginBottom:20}}>
          <div style={{fontSize:11,color:T.muted,marginBottom:6,letterSpacing:1}}>YOU RECEIVE (TON)</div>
          <div style={{fontFamily:"'Orbitron'",fontSize:22,fontWeight:700,color:T.green}}>{tonOut}</div>
          <div style={{fontSize:11,color:T.muted,marginTop:4}}>TON Network</div>
        </div>
        {swapError&&<div style={{background:"rgba(255,77,77,0.08)",border:"1px solid rgba(255,77,77,0.3)",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:T.red}}>{swapError}</div>}
        <button className="btn-gold shimmer-btn" onClick={handleConfirmSwap} disabled={swapping||!amount} style={{width:"100%",padding:16,border:"none",borderRadius:14,fontFamily:"'Rajdhani'",fontWeight:700,fontSize:16,cursor:swapping?"not-allowed":"pointer",color:"#000",opacity:(!amount||swapping)?0.7:1}}>
          {swapping?"⏳ Swapping…":"⚡ Confirm Swap"}
        </button>
        <div style={{textAlign:"center",fontSize:11,color:T.muted,marginTop:10}}>Convert ENERGY → TON before withdrawing</div>
      </div>
    </div>
  );
}

function WithdrawModal({onClose,tonBalance,qualifiedFriends,onGoSwap,onInvite,onWithdrawComplete,minWithdrawTon}){
  const MIN=minWithdrawTon??2.0;
  const NEEDED=5;
  const hasMin=tonBalance>=MIN;
  const hasRefs=qualifiedFriends>=NEEDED;
  const [walletAddress,setWalletAddress]=useState("");
  const [withdrawing,setWithdrawing]=useState(false);
  const [withdrawError,setWithdrawError]=useState(null);
  const [withdrawDone,setWithdrawDone]=useState(false);
  async function handleWithdraw(){
    if(!walletAddress.trim()){setWithdrawError("Please enter your TON wallet address.");return;}
    setWithdrawing(true);setWithdrawError(null);
    try{await api.requestWithdraw(tonBalance,walletAddress.trim());setWithdrawDone(true);if(onWithdrawComplete)onWithdrawComplete();}
    catch(e){setWithdrawError(e?.message||"Withdrawal request failed. Please try again.");}
    finally{setWithdrawing(false);}
  }
  if(!hasMin){
    return(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
        <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:"1px solid #1e2a1e",borderRadius:"24px 24px 0 0",padding:24,width:"100%",maxWidth:430,animation:"slideUp 0.3s ease"}}>
          <div style={{width:40,height:4,background:"#2a2a2a",borderRadius:2,margin:"0 auto 20px"}}/>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:48,marginBottom:12}}>🔒</div>
            <div style={{fontFamily:"'Orbitron'",fontWeight:700,fontSize:18,color:T.gold,marginBottom:8}}>NOT ENOUGH TON</div>
            <div style={{fontSize:13,color:T.muted,lineHeight:1.6}}>You need a minimum of <span style={{color:T.gold,fontWeight:700}}>{MIN} TON</span> to withdraw.<br/>Keep mining and swapping EARNX to grow your balance.</div>
          </div>
          <div style={{background:"rgba(0,0,0,0.4)",border:"1px solid #1e2a1e",borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,color:T.muted}}>Your TON balance</span>
              <span style={{fontFamily:"'Orbitron'",fontSize:12,color:T.red,fontWeight:700}}>{tonBalance.toFixed(5)} TON</span>
            </div>
            <div style={{background:"#1a1a1a",borderRadius:6,height:8,overflow:"hidden",marginBottom:6}}>
              <div style={{width:`${Math.min((tonBalance/MIN)*100,100)}%`,height:"100%",background:`linear-gradient(90deg,${T.red},${T.gold})`,borderRadius:6,transition:"width 0.5s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.muted}}>
              <span>0 TON</span><span style={{color:T.gold}}>Min: {MIN} TON</span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button className="btn-gold" onClick={()=>{onClose();onGoSwap();}} style={{width:"100%",padding:14,background:`linear-gradient(135deg,${T.gold},${T.goldDim})`,border:"none",borderRadius:12,fontFamily:"'Rajdhani'",fontWeight:700,fontSize:15,cursor:"pointer",color:"#000",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <Icon name="swap" size={16}/> Swap ENERGY → TON
            </button>
            <button onClick={onClose} style={{width:"100%",padding:12,background:"transparent",border:"1px solid #1e2a1e",borderRadius:12,fontFamily:"'Rajdhani'",fontWeight:600,fontSize:14,cursor:"pointer",color:T.muted}}>Keep Mining</button>
          </div>
        </div>
      </div>
    );
  }
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${hasRefs?T.goldDim:"#1e2a1e"}`,borderRadius:"24px 24px 0 0",padding:24,width:"100%",maxWidth:430,animation:"slideUp 0.3s ease",boxShadow:hasRefs?`0 -8px 40px ${T.goldGlow}`:"none"}}>
        <div style={{width:40,height:4,background:"#2a2a2a",borderRadius:2,margin:"0 auto 20px"}}/>
        <div style={{fontFamily:"'Orbitron'",fontWeight:700,fontSize:18,color:T.gold,marginBottom:4}}>WITHDRAW TON</div>
        <div style={{fontSize:13,color:T.muted,marginBottom:20}}>Minimum withdrawal: {MIN} TON</div>
        <div style={{background:"rgba(57,255,138,0.05)",border:`1px solid ${T.greenDim}`,borderRadius:12,padding:14,marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:11,color:T.muted,marginBottom:2}}>Available TON balance</div><div style={{fontFamily:"'Orbitron'",fontWeight:900,fontSize:22,color:T.green}}>{tonBalance.toFixed(5)} TON</div></div>
          <div style={{fontSize:28}}>✅</div>
        </div>
        <div style={{background:hasRefs?"rgba(57,255,138,0.06)":T.goldFaint,border:`1px solid ${hasRefs?T.greenDim:T.goldDim}`,borderRadius:16,padding:18,marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <span style={{color:hasRefs?T.green:T.gold}}><Icon name={hasRefs?"check":"lock"} size={18}/></span>
            <div><div style={{fontWeight:700,fontSize:14,color:hasRefs?T.green:T.gold}}>Referral Requirement</div><div style={{fontSize:12,color:T.muted}}>Need 5 active friends to unlock withdrawal</div></div>
          </div>
          <div style={{background:"rgba(0,0,0,0.4)",borderRadius:8,height:8,marginBottom:8,overflow:"hidden"}}>
            <div style={{width:`${(qualifiedFriends/NEEDED)*100}%`,height:"100%",background:`linear-gradient(90deg,${T.gold},${T.green})`,borderRadius:8,transition:"width 0.5s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:12}}>
            <span style={{color:T.muted}}>{qualifiedFriends} of {NEEDED} active friends</span>
            <span style={{color:hasRefs?T.green:T.gold,fontWeight:700}}>{hasRefs?"✓ Unlocked":"Locked"}</span>
          </div>
          <div style={{background:"rgba(0,0,0,0.3)",borderRadius:10,padding:12}}>
            <div style={{fontSize:10,color:T.muted,marginBottom:6,letterSpacing:1,fontFamily:"'Orbitron'"}}>ACTIVE FRIEND MEANS:</div>
            <div style={{fontSize:12,color:T.text,display:"flex",flexDirection:"column",gap:4}}>
              <span>✅ Joined via your referral link</span>
              <span>✅ Has logged in at least once</span>
              <span>✅ Mined for <span style={{color:T.gold,fontWeight:700}}>10+ days</span> this month</span>
            </div>
          </div>
        </div>
        {hasRefs?(
          withdrawDone?(
            <div style={{background:"rgba(57,255,138,0.08)",border:`1px solid ${T.greenDim}`,borderRadius:14,padding:20,textAlign:"center"}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontFamily:"'Orbitron'",fontWeight:700,fontSize:15,color:T.green,marginBottom:4}}>Request Submitted!</div>
              <div style={{fontSize:12,color:T.muted}}>Admin will process your withdrawal within 24h.</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{background:"rgba(0,0,0,0.4)",border:"1px solid #1e2a1e",borderRadius:12,padding:14}}>
                <div style={{fontSize:11,color:T.muted,marginBottom:6,letterSpacing:1}}>YOUR TON WALLET ADDRESS</div>
                <input type="text" placeholder="UQ... or EQ..." value={walletAddress} onChange={e=>{setWalletAddress(e.target.value);setWithdrawError(null);}} style={{width:"100%",background:"transparent",border:"none",outline:"none",fontFamily:"'Rajdhani'",fontSize:14,fontWeight:600,color:T.text}}/>
              </div>
              {withdrawError&&<div style={{background:"rgba(255,77,77,0.08)",border:"1px solid rgba(255,77,77,0.3)",borderRadius:10,padding:"10px 14px",fontSize:12,color:T.red}}>{withdrawError}</div>}
              <button className="shimmer-btn btn-gold" onClick={handleWithdraw} disabled={withdrawing||!walletAddress.trim()} style={{width:"100%",padding:16,border:"none",borderRadius:14,fontFamily:"'Rajdhani'",fontWeight:700,fontSize:16,cursor:withdrawing?"not-allowed":"pointer",color:"#000",opacity:(!walletAddress.trim()||withdrawing)?0.7:1}}>
                {withdrawing?"⏳ Submitting…":"⚡ Withdraw to Wallet"}
              </button>
              <div style={{textAlign:"center",fontSize:11,color:T.muted}}>Amount: {tonBalance.toFixed(5)} TON · Processed within 24h</div>
            </div>
          )
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{background:"rgba(255,77,77,0.06)",border:"1px solid rgba(255,77,77,0.2)",borderRadius:12,padding:14,display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{color:T.red,flexShrink:0,marginTop:1}}><Icon name="info" size={16}/></span>
              <div style={{fontSize:12,color:T.muted,lineHeight:1.6}}>You still need <span style={{color:T.gold,fontWeight:700}}>{NEEDED-qualifiedFriends} more active friend{NEEDED-qualifiedFriends!==1?"s":""}</span>. Ask them to mine for 10 days this month to qualify.</div>
            </div>
            <button onClick={()=>{onClose();onInvite&&onInvite();}} className="btn-gold" style={{width:"100%",padding:14,background:`linear-gradient(135deg,${T.gold},${T.goldDim})`,border:"none",borderRadius:12,fontFamily:"'Rajdhani'",fontWeight:700,fontSize:15,cursor:"pointer",color:"#000",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <Icon name="share" size={16}/> Invite Friends Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function EarnX(){
  if (window.location.pathname === "/admin") {
    return <EarnXAdmin />;
  }
  const [tab,setTab]=useState("home");
  const [lang,setLang]=useState(()=>localStorage.getItem("earnx_lang")||"en");
  const [showLanguage,setShowLanguage]=useState(false);
  const L=LANGUAGES[lang]||LANGUAGES.en;
  const C=HOME_COPY[lang]||HOME_COPY.en;
  const TC=TASK_COPY[lang]||TASK_COPY.en;
  const setLanguage=(next)=>{setLang(next);localStorage.setItem("earnx_lang",next);setShowLanguage(false);};
  const [nova,setNova]=useState(0);          // new users start at 0
  const [hashes,setHashes]=useState(0);      // new users start at 0
  const [tonBalance,setTonBalance]=useState(0); // new users start at 0
  const [miningPower,setMiningPower]=useState(1000);
  const [adsEnabled,setAdsEnabled]=useState(false);
  const [adTriggers,setAdTriggers]=useState({start_mining:false,collect_mining:false});
  const [adBlockId,setAdBlockId]=useState("");
  const [userLoaded,setUserLoaded]=useState(false);
  const [shopTiers,setShopTiers]=useState(SHOP.TIERS);
  const [shopWallet,setShopWallet]=useState("");
  const [taskItems,setTaskItems]=useState([]);
  const [tasksLoading,setTasksLoading]=useState(false);
  const [taskBusy,setTaskBusy]=useState(null);
  const userDbId=useRef(null);
  const [showWithdraw,setShowWithdraw]=useState(false);
  const [showSwap,setShowSwap]=useState(false);
  // Mining state — persisted in localStorage so it survives page reloads/quit
  const MINING_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours — matches Dulce CANDY 24h production loop
  const [miningTick,setMiningTick]=useState(0);
  const [miningStartedAt, setMiningStartedAt] = useState(() => {
    const v = localStorage.getItem("nm_mining_started_at");
    return v ? Number(v) : null;
  });
  const miningActive = miningStartedAt !== null && (Date.now() - miningStartedAt) < MINING_DURATION_MS;
  const claimReady   = miningStartedAt !== null && (Date.now() - miningStartedAt) >= MINING_DURATION_MS;
  const miningSessionReward=Number(MINING.hashesPerSession(miningPower)||0);
  const miningElapsed=Math.max(0,Math.min(MINING_DURATION_MS,(miningTick||Date.now())-(miningStartedAt||Date.now())));
  const miningAccumulated=miningActive?miningSessionReward*(miningElapsed/MINING_DURATION_MS):(claimReady?miningSessionReward:0);
  const miningTimer=useRef(null);
  useEffect(()=>{ if(!miningStartedAt) return; const id=setInterval(()=>setMiningTick(Date.now()),1000); return ()=>clearInterval(id); },[miningStartedAt]);
  const authResultRef=useRef(null);
  const [qualifiedFriends, setQualifiedFriends] = useState(0);
  const [claimedMilestones, setClaimedMilestones] = useState([]);
  const [minWithdrawTon, setMinWithdrawTon] = useState(2.0);
  const [showGift, setShowGift] = useState(false);
  const [giftUnclaimed, setGiftUnclaimed] = useState(false); // shows banner on homepage
  const [giftOpened, setGiftOpened] = useState(false);
  const [welcomeTon, setWelcomeTon] = useState(1.5);
  const [giftParticles, setGiftParticles] = useState([]);
  const [refStats, setRefStats] = useState({total:0, valid:0, pending:0, nova:0, list:[]});
  const [buyingTierId, setBuyingTierId] = useState(null);
  const [buyError, setBuyError] = useState(null);
  // TonConnect — wallet for shop purchases
  const [tonConnectUI] = useTonConnectUI();
  const tonWalletAddress = useTonAddress();

  // ── Load real user data from API on mount ────────────────────────────────
  useEffect(()=>{
    let realtimeChannel = null;
    (async()=>{
      try {
        initTelegram();
        const authResult = await authenticate();
        authResultRef.current = authResult;
        // The Telegram auth endpoint already returns the real database user id.
        // Keep it immediately so shop payments do not depend on /me finishing first.
        if (authResult?.user?.id) userDbId.current = authResult.user.id;
        const data = await api.me();
        if(data?.user){
          const realNova = Number(data.user.nova ?? 0);
          const realHashes = Number(data.user.hashes ?? 0);
          const realTon = Number(data.user.ton_balance ?? 0);
          // Always recalculate mining power from EARNX — never trust the DB value
          const realPower = miningPowerFromNova(realNova);
          setNova(realNova);
          setHashes(realHashes);
          setTonBalance(realTon);
          setMiningPower(realPower);
          userDbId.current = data.user.id;
          // Show gift banner on homepage if user hasn't claimed yet
          if (data.user.gift_claimed === false) {
            setGiftUnclaimed(true); // shows the tappable gift banner
          }
          // If DB power is stale/wrong, fix it silently in the background
          if(realPower !== Number(data.user.mining_power)){
            api.updateMiningPower(realPower).catch(()=>{});
          }

          // ── Fix 5: Supabase Realtime — push admin balance/shop changes live ──
          // Requires Realtime enabled on the `users` table in your Supabase project:
          // Dashboard → Database → Replication → enable `users` table.
          realtimeChannel = supabase
            .channel(`user-updates:${data.user.id}`)
            .on("postgres_changes", {
              event: "UPDATE",
              schema: "public",
              table: "users",
              filter: `id=eq.${data.user.id}`,
            }, (payload) => {
              const u = payload.new;
              setNova(Number(u.nova ?? 0));
              setHashes(Number(u.hashes ?? 0));
              setTonBalance(Number(u.ton_balance ?? 0));
              setMiningPower(miningPowerFromNova(Number(u.nova ?? 0)));
            })
            .subscribe();
        // Restore mining session from API if active
        if(data?.mining?.startedAt){
          const started = new Date(data.mining.startedAt).getTime();
          setMiningStartedAt(started);
          localStorage.setItem("nm_mining_started_at", String(started));
        }
        }

        // ── Load shop tiers from API — no auth required, always runs ──
        try {
          const shopData = await api.listShopTiers();
          setShopTiers(shopData?.tiers?.length ? shopData.tiers : SHOP.TIERS);
          if(shopData?.walletAddress) setShopWallet(shopData.walletAddress);
        } catch(_) {}



        // Load referral count from API
        try {
          const refData = await api.referrals();
          // API returns { total, qualified, pending, requiredForWithdraw, list }
          const qualified = refData?.qualified ?? 0;
          setQualifiedFriends(qualified);
          // Load min withdraw from admin config
          try {
            const rwCfg = await api.getRewardConfig?.();
            if (rwCfg?.minWithdrawTon) setMinWithdrawTon(Number(rwCfg.minWithdrawTon));
          } catch(_) {}
          // Load which milestones already claimed
          try {
            const msData = await api.milestoneClaims();
            setClaimedMilestones(msData?.claimed ?? []);
          } catch(_) {}
          const total   = refData?.total ?? 0;
          const pending = refData?.pending ?? 0;
          const valid   = total - pending;
          const novaEarned = (refData?.list ?? []).reduce((s,r) => s + Number(r.nova_earned ?? 0), 0);
          setRefStats({ total, valid, pending, nova: novaEarned, list: refData?.list ?? [] });
        } catch(_) {}

      } catch(e){
        console.warn("Failed to load user data:", e);
      } finally {
        setUserLoaded(true);

      }
    })();
    return () => {
      if(realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ── Poll /me every 60s — backup so admin credits always reflect ───────────
  useEffect(()=>{
    const poll = setInterval(async ()=>{
      try {
        const fresh = await api.me();
        if(fresh?.user){
          setNova(Number(fresh.user.nova ?? 0));
          setHashes(Number(fresh.user.hashes ?? 0));
          setTonBalance(Number(fresh.user.ton_balance ?? 0));
          setMiningPower(miningPowerFromNova(Number(fresh.user.nova ?? 0)));
        }
      } catch(_){}
    }, 60_000);
    return ()=> clearInterval(poll);
  },[]);

  // ── Load ad config from API ───────────────────────────────────────────────
  // Also load shop tiers independently so they show even if auth is slow
  useEffect(()=>{
    api.listShopTiers().then(d=>{ setShopTiers(d?.tiers?.length ? d.tiers : SHOP.TIERS); if(d?.walletAddress) setShopWallet(d.walletAddress); }).catch(()=>setShopTiers(SHOP.TIERS));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{
    fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}/ad-config-public`)
      .then(r=>r.ok?r.json():null)
      .then(cfg=>{
        if(cfg){
          setAdsEnabled(!!cfg.adsEnabled);
          setAdTriggers(cfg.adTriggers ?? {});
          setAdBlockId(String(cfg.adBlockId ?? import.meta.env.VITE_ADSGRAM_BLOCK_ID ?? "").trim());
        }
      })
      .catch(()=>{});
  },[]);
  // ─────────────────────────────────────────────────────────────────────────
  // BOT_USERNAME — can be overridden via VITE_BOT_USERNAME in .env
  const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || "earnxtop1_bot";
  const tgUser = getTelegramUser();
  const myTelegramId = tgUser?.id ?? null;
  const referralLink = myTelegramId
    ? `https://t.me/${BOT_USERNAME}?startapp=ref_${myTelegramId}`
    : null;

  const [copiedLink, setCopiedLink] = useState(false);

  function handleShareReferral() {
    if (!referralLink) return;
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      // Opens the Telegram share sheet pre-filled with the referral link
      const text = encodeURIComponent("Join me on EarnX and start mining EARNX! 🚀");
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`);
    } else {
      // Fallback for desktop/dev: just copy
      handleCopyLink();
    }
  }

  function handleCopyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

  const [activities,setActivities]=useState(()=>Array.from({length:6},()=>genActivity()));


  // ── Auto-update mining power when EARNX changes ───────────────────────────
  useEffect(()=>{
    if(!userLoaded) return; // don't run before initial data is loaded
    const newPower = miningPowerFromNova(nova);
    if(newPower !== miningPower){
      setMiningPower(newPower);
      // Sync to database so API also uses the updated power
      api.updateMiningPower(newPower).catch(()=>{});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[nova, userLoaded]);
  // ─────────────────────────────────────────────────────────────────────────

  // Mining countdown re-render (keeps timer display live)
  const [,forceUpdate]=useState(0);
  useEffect(()=>{
    const iv=setInterval(()=>{
      forceUpdate(n=>n+1);
    },1000);
    return()=>clearInterval(iv);
  },[]);

  // Activity feed
  useEffect(()=>{
    const schedule=()=>{
      const delay=3000+Math.random()*3000;
      return setTimeout(()=>{
        setActivities(prev=>[genActivity(),...prev.slice(0,7)]);
        timerRef.current=schedule();
      },delay);
    };
    const timerRef={current:schedule()};
    return()=>clearTimeout(timerRef.current);
  },[]);


  // On mount, if a mining session is active, schedule a re-render when it becomes claimable
  useEffect(()=>{
    if(miningStartedAt !== null){
      const remaining = MINING_DURATION_MS - (Date.now() - miningStartedAt);
      if(remaining > 0){
        miningTimer.current = setTimeout(()=>setMiningStartedAt(t=>t), remaining);
      }
    }
    return ()=>clearTimeout(miningTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // ── REWARDED AD ENGINE ──
  async function watchAd(onComplete, trigger="start_mining"){
    // AdsGram Rewarded: only continue when the rewarded ad is actually completed.
    if(!(adsEnabled && adTriggers[trigger])) { onComplete(); return; }
    if(!adBlockId || !window.Adsgram?.init){
      alert("Rewarded ads are not configured yet. Please try again later.");
      return;
    }
    try{
      const controller=window.Adsgram.init({blockId:adBlockId});
      const result=await controller.show();
      if(result?.done !== false) onComplete();
      else alert("Ad was not completed, so no reward was granted.");
    }catch(err){
      console.warn("[EarnX] AdsGram reward not completed:",err);
      alert("The ad could not be completed. No reward was granted.");
    }
  }

  useEffect(()=>{
    if(tab !== "tasks" || !userLoaded) return;
    let alive=true;
    setTasksLoading(true);
    api.tasks().then(r=>{ if(alive) setTaskItems(Array.isArray(r?.tasks)?r.tasks:[]); }).catch(()=>{ if(alive) setTaskItems([]); }).finally(()=>{ if(alive) setTasksLoading(false); });
    return ()=>{alive=false;};
  },[tab,userLoaded]);

  async function runTask(task){
    if(task.done || taskBusy) return;
    setTaskBusy(task.id);
    try{
      if(task.url) window.open(task.url,"_blank","noopener,noreferrer");
      const result=await api.claimTask(task.id);
      setTaskItems(prev=>prev.map(t=>t.id===task.id?{...t,done:true}:t));
      if(result?.nova!=null) setNova(Number(result.nova));
      const fresh=await api.me(); if(fresh?.user){ setNova(Number(fresh.user.nova??0)); setHashes(Number(fresh.user.hashes??0)); setTonBalance(Number(fresh.user.ton_balance??0)); setMiningPower(miningPowerFromNova(Number(fresh.user.nova??0))); }
      alert("✅ "+TC.completed+Number(result?.reward??task.reward??0).toLocaleString()+" EARNX");
    }catch(e){
      if(e?.status===409) setTaskItems(prev=>prev.map(t=>t.id===task.id?{...t,done:true}:t));
      else alert(e?.message||"Task could not be completed.");
    }finally{setTaskBusy(null);}
  }

  function startMining(){
    // Watch ad first, then start 24h mining session
    watchAd(async ()=>{
      try {
        const result = await api.startMining();
        // Use the server's authoritative start time so client and server stay in sync
        const started = new Date(result.startedAt).getTime();
        localStorage.setItem("nm_mining_started_at", String(started));
        setMiningStartedAt(started);
        clearTimeout(miningTimer.current);
        const remaining = new Date(result.claimReadyAt).getTime() - Date.now();
        miningTimer.current = setTimeout(()=>setMiningStartedAt(t=>t), Math.max(0, remaining));
      } catch(e){
        // 409 means a session is already active — restore it from localStorage
        if(e?.status === 409){
          const now = Date.now();
          localStorage.setItem("nm_mining_started_at", String(now));
          setMiningStartedAt(now);
        } else {
          console.warn("Start mining failed:", e);
        }
      }
    }, "start_mining");
  }

  function claimHashes(){
    // Watch ad before claiming, then call the real API
    watchAd(async ()=>{
      try {
        const result = await api.claimMining();
        // Update all balances from server response — nova is now authoritative
        setHashes(Number(result.hashes));
        setNova(Number(result.nova));
        setTonBalance(Number(result.tonBalance));
        localStorage.removeItem("nm_mining_started_at");
        setMiningStartedAt(null);

        // Re-fetch /me so balance is always real DB value — carries forward into next session
        try {
          const fresh = await api.me();
          if(fresh?.user){
            setHashes(Number(fresh.user.hashes ?? 0));
            setNova(Number(fresh.user.nova ?? 0));
            setTonBalance(Number(fresh.user.ton_balance ?? 0));
            setMiningPower(miningPowerFromNova(Number(fresh.user.nova ?? 0)));
          }
        } catch(_){ /* silent — claim response values still set above */ }

      } catch(e){
        console.warn("Claim failed:", e);
        if(e?.status===404){
          localStorage.removeItem("nm_mining_started_at");
          setMiningStartedAt(null);
        } else if(e?.status===425){
          alert("⏳ Mining not complete yet. Please wait a little longer and try again.");
        } else {
          alert("❌ Claim failed. Please check your connection and try again.");
        }
      }
    }, "collect_mining");
  }

  const formatTime=s=>{
    if(s>=3600){const h=Math.floor(s/3600);const m=Math.floor((s%3600)/60);const sec=s%60;return`${h}:${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;}
    return`${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;
  };


  // ── Shop: real TON payment via TON Connect ────────────────────────────────
  async function handleBuyTier(tier){
    if(buyingTierId) return;
    setBuyError(null);

    let connectedAddress = tonWalletAddress;
    if(!connectedAddress){
      try {
        const wallet = await tonConnectUI.connectWallet();
        connectedAddress = wallet?.account?.address || "";
      } catch(e) {
        if(e?.message?.includes("User declined") || e?.message?.includes("Cancel")) return;
        setBuyError(e?.message || "Could not connect your TON wallet.");
        return;
      }
      if(!connectedAddress){
        setBuyError("TON wallet connected. Tap the plan again to continue.");
        return;
      }
    }

    const receiverWallet = shopWallet || import.meta.env.VITE_TON_WALLET_ADDRESS || "";
    if(!receiverWallet){
      setBuyError("TON receiving wallet is not configured.");
      return;
    }
    // The account request can still be finishing while the user taps a shop plan.
    // Refresh /me here instead of blocking the payment with a false "still loading" error.
    if(!userDbId.current){
      try {
        const fresh = await api.me();
        if(fresh?.user?.id){
          userDbId.current = fresh.user.id;
          setNova(Number(fresh.user.nova ?? nova));
          setHashes(Number(fresh.user.hashes ?? hashes));
          setTonBalance(Number(fresh.user.ton_balance ?? tonBalance));
          setMiningPower(miningPowerFromNova(Number(fresh.user.nova ?? nova)));
        }
      } catch(e) {
        console.warn("[EarnX] Account refresh before shop payment failed:", e);
      }
    }

    if(!userDbId.current){
      setBuyError("Your EarnX account could not be loaded. Please reopen the app and try again.");
      return;
    }

    setBuyingTierId(tier.id);
    try {
      const nanotons = BigInt(Math.round(Number(tier.cost) * 1_000_000_000)).toString();
      const randomId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const paymentComment = `EarnX Shop|${userDbId.current}|${tier.id}|${randomId}`;
      // TON Connect expects message payload to be a base64-encoded BOC cell.
      // Raw base64 comment bytes are not a valid TON cell and are rejected by validation.
      const boc = beginCell()
        .storeUint(0, 32)
        .storeStringTail(paymentComment)
        .endCell()
        .toBoc();
      let bocBinary = "";
      for (let i = 0; i < boc.length; i++) bocBinary += String.fromCharCode(boc[i]);
      const payload = btoa(bocBinary);

      console.log("[EarnX] Opening TON payment", {
        receiver: receiverWallet,
        amount: nanotons,
        wallet: connectedAddress,
        tier: tier.id
      });

      await tonConnectUI.sendTransaction({
        network: "-239",
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{
          address: receiverWallet,
          amount: nanotons,
          payload,
        }],
      });

      const purchase = await api.buyShopTier(tier.id, connectedAddress, paymentComment);
      if (purchase?.status === "pending") {
        setBuyError("Payment was sent, but TON is still confirming it. No EARNX was added yet. Wait a few seconds and try the plan again.");
        return;
      }
      if (purchase?.status !== "confirmed") {
        setBuyError("Payment was not confirmed. No EARNX was added.");
        return;
      }
      const fresh = await api.me();
      if (fresh?.user) {
        setNova(Number(fresh.user.nova ?? 0));
        setHashes(Number(fresh.user.hashes ?? 0));
        setTonBalance(Number(fresh.user.ton_balance ?? 0));
        setMiningPower(miningPowerFromNova(Number(fresh.user.nova ?? 0)));
      }
      alert("Payment confirmed! +" + tier.power + " EARNX has been added to your account.");
    } catch(e){
      if(e?.message?.includes("User declined") || e?.message?.includes("Cancel")){
      } else {
        console.error("[EarnX] Shop payment error:", e);
      setBuyError(e?.message ?? "Payment failed or is still being confirmed. Please try again.");
      }
    } finally {
      setBuyingTierId(null);
    }
  }

  // ── Fix 5: Shop tiers come from API (loaded on mount) so admin edits reflect live.
  const displayTiers = shopTiers.map(t => ({
    id: t.id,
    power: t.label,
    cost: String(t.priceTon),
    daily: typeof t.dailyTon === "number" ? t.dailyTon.toFixed(5) : "—",
    month: typeof t.monthTon === "number" ? t.monthTon.toFixed(5) : "—",
    hot: !!t.hot,
  }));

  const leaderboard=[
    {name:"MikeCarterX",   power:"18.4M",daily:"6.62"},
    {name:"JoaoSilva99",   power:"14.2M",daily:"5.11"},
    {name:"EmilyJOfficial",power:"11.7M",daily:"4.21"},
    {name:"SantosGabriel_",power:"9.3M", daily:"3.35"},
    {name:"AshleyWave",    power:"7.8M", daily:"2.81"},
    {name:"LucasOliveira7",power:"5.5M", daily:"1.98"},
    {name:"DanielB_Pro",   power:"3.9M", daily:"1.40"},
    {name:"RafaCostaX",    power:"2.1M", daily:"0.76"},
    {name:"JessicaMLive",  power:"1.4M", daily:"0.50"},
    {name:"BrunoFps",      power:"980K", daily:"0.35"},
  ];

  const navItems=[
    {id:"home",icon:"home",label:"Home"},
    {id:"tasks",icon:"tasks",label:"Tasks"},
    {id:"team",icon:"users",label:"Refer"},
    {id:"wallet",icon:"wallet",label:"Wallet"},
    {id:"profile",icon:"user",label:"Profile"},
  ];

  const novaDisplay=nova>=1000000?`${(nova/1000000).toFixed(2)}M`:nova>=1000?`${(nova/1000).toFixed(1)}K`:nova;

  return(
    <div style={{background:"#f7f8fc",minHeight:"100vh",maxWidth:430,margin:"0 auto",fontFamily:"'DM Sans',sans-serif",color:"#202637",position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box} body{background:#f7f8fc}
        @keyframes exIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .ex-card{background:#fff;border:1px solid #e9ecf3;border-radius:21px;box-shadow:0 7px 24px rgba(40,50,80,.06)}
        .ex-btn{border:0;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:700}
        .ex-nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;background:rgba(255,255,255,.96);backdrop-filter:blur(18px);border-top:1px solid #e9ecf3;z-index:300;padding:7px 5px calc(7px + env(safe-area-inset-bottom))}
        .ex-nav button{flex:1;background:transparent;border:0;color:#8d96a7;font:600 10px 'DM Sans';display:flex;flex-direction:column;align-items:center;gap:5px;padding:5px 1px;cursor:pointer}
        .ex-nav button.active{color:#5d57e9}
      `}</style>

      {showGift&&<div style={{position:"fixed",inset:0,zIndex:1001,background:"rgba(20,25,40,.55)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
        <div className="ex-card" style={{padding:28,width:"100%",maxWidth:350,textAlign:"center"}}>
          {!giftOpened?<><div onClick={async()=>{try{await api.claimGift?.(); const fresh=await api.me(); if(fresh?.user){setTonBalance(Number(fresh.user.ton_balance ?? 0));setNova(Number(fresh.user.nova ?? 0));setHashes(Number(fresh.user.hashes ?? 0));setMiningPower(miningPowerFromNova(Number(fresh.user.nova ?? 0)));} setGiftOpened(true);}catch(e){setBuyError(e?.message||"Could not claim the welcome gift.");}}} style={{fontSize:75,cursor:"pointer"}}>🎁</div><b style={{fontSize:20}}>Welcome to EarnX</b><div style={{fontSize:12,color:"#8d96a7",marginTop:5}}>Tap the gift to reveal your bonus.</div></>:<><div style={{fontSize:50}}>🎉</div><b style={{fontSize:20}}>Reward unlocked</b><div style={{fontSize:12,color:"#8d96a7",marginTop:5}}>Welcome bonus</div><div style={{fontSize:34,fontWeight:800,color:"#5d57e9",margin:"8px 0 16px"}}>+{welcomeTon} TON</div><button className="ex-btn" onClick={async()=>{try{const fresh=await api.me();if(fresh?.user){setTonBalance(Number(fresh.user.ton_balance ?? 0));setNova(Number(fresh.user.nova ?? 0));setHashes(Number(fresh.user.hashes ?? 0));setMiningPower(miningPowerFromNova(Number(fresh.user.nova ?? 0)));}}catch(_){} setShowGift(false);setGiftUnclaimed(false);}} style={{width:"100%",padding:13,borderRadius:14,background:"linear-gradient(135deg,#5d57e9,#857fff)",color:"#fff"}}>Claim reward</button></>}
        </div>
      </div>}

      <header style={{background:"#fff",borderBottom:"1px solid #eceef4",padding:"16px 17px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:40,height:40,borderRadius:13,background:"linear-gradient(135deg,#5d57e9,#8580ff)",color:"#fff",display:"grid",placeItems:"center",fontSize:18,fontWeight:800}}>E</div><div><b style={{fontSize:17}}>EarnX</b><div style={{fontSize:10,color:"#929aaa"}}>Rewards hub</div></div></div>
        <button className="ex-btn" onClick={()=>setTab("profile")} style={{width:40,height:40,borderRadius:"50%",background:"#f0efff",color:"#5d57e9",fontSize:17}}>👤</button>
      </header>

      <main style={{padding:"18px 16px 94px",animation:"exIn .25s ease"}}>
        {tab==="home"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",marginBottom:14}}><div><div style={{fontSize:12,color:"#8d96a7"}}>{C.welcome}</div><div style={{fontSize:25,fontWeight:800,letterSpacing:-.7}}>{tgUser?.first_name||"EarnX member"} 👋</div></div><div style={{fontSize:10,color:"#18a76a",fontWeight:800}}>● LIVE</div></div>
          <section style={{borderRadius:25,padding:21,color:"#fff",background:"linear-gradient(135deg,#5d57e9,#716af1 55%,#8982ff)",boxShadow:"0 14px 34px rgba(93,87,233,.23)",position:"relative",overflow:"hidden",marginBottom:14}}>
            <div style={{position:"absolute",width:190,height:190,borderRadius:"50%",background:"rgba(255,255,255,.09)",right:-65,top:-90}}/>
            <div style={{fontSize:12,opacity:.8}}>{C.totalBalance}</div><div style={{fontSize:39,fontWeight:800,letterSpacing:-1.5,margin:"3px 0 2px"}}>{novaDisplay}</div><div style={{fontSize:10,opacity:.72}}>{C.earnxCredits}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:19}}><div><b>{tonBalance.toFixed(3)}</b><div style={{fontSize:9,opacity:.7}}>TON</div></div><div><b>{refStats.total}</b><div style={{fontSize:9,opacity:.7}}>{C.referrals}</div></div><div><b>{qualifiedFriends}</b><div style={{fontSize:9,opacity:.7}}>{L.active}</div></div></div>
          </section>

          <div className="ex-card" style={{padding:17,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><b style={{fontSize:18}}>{C.miningCenter}</b><div style={{fontSize:11,color:"#8d96a7"}}>{C.earnEvery}</div></div><div style={{width:40,height:40,borderRadius:13,background:"#f0efff",display:"grid",placeItems:"center"}}>⚡</div></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:11}}>
              <div style={{background:"#f6f7fb",borderRadius:15,padding:13}}><div style={{fontSize:9,color:"#8d96a7"}}>{C.balance}</div><b style={{fontSize:20,color:"#5d57e9"}}>{nova.toLocaleString()}</b><div style={{fontSize:9,color:"#8d96a7"}}>{C.credits}</div></div>
              <div style={{background:"#f6f7fb",borderRadius:15,padding:13}}><div style={{fontSize:9,color:"#8d96a7"}}>{C.energy}</div><b style={{fontSize:20,color:"#202637"}}>{Number(hashes).toFixed(4)}</b><div style={{fontSize:9,color:"#8d96a7"}}>{C.miningEnergy}</div></div>
              <div style={{background:"#f6f7fb",borderRadius:15,padding:13}}><div style={{fontSize:9,color:"#8d96a7"}}>{C.tonBalance}</div><b style={{fontSize:20,color:"#18a76a"}}>{tonBalance.toFixed(5)}</b><div style={{fontSize:9,color:"#8d96a7"}}>TON</div></div>
              <div style={{background:"#f6f7fb",borderRadius:15,padding:13}}><div style={{fontSize:9,color:"#8d96a7"}}>{C.miningPower}</div><b style={{fontSize:20,color:"#202637"}}>{miningPower.toLocaleString()}</b><div style={{fontSize:9,color:"#8d96a7"}}>{C.power}</div></div>
            </div>
            <div style={{background:"#f0efff",borderRadius:15,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><div><div style={{fontSize:9,color:"#8d96a7"}}>{C.nextReward}</div><b style={{fontSize:18,color:"#5d57e9"}}>+{MINING.hashesPerSession(miningPower).toFixed(4)} EARNX</b></div><div style={{fontSize:10,color:"#8d96a7",textAlign:"right"}}>{C.session}</div></div>
            {!miningActive&&!claimReady&&<button className="ex-btn" onClick={startMining} style={{width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#5d57e9,#817bff)",color:"#fff"}}>{C.start}</button>}
            {miningActive&&!claimReady&&<div style={{background:"#effbf6",border:"1px solid #ccefe0",borderRadius:14,padding:"16px 12px",textAlign:"center"}}><div style={{fontSize:10,color:"#678176",marginBottom:3}}>{C.accumulated}</div><b style={{fontSize:28,color:"#18a76a"}}>+{miningAccumulated.toFixed(4)} EARNX</b><div style={{fontSize:10,color:"#678176",marginTop:6}}>{C.progress} · {formatTime(Math.max(0,Math.ceil((MINING_DURATION_MS-(Date.now()-miningStartedAt))/1000)))}</div></div>}
            {claimReady&&<button className="ex-btn" onClick={claimHashes} style={{width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#18a76a,#36c98d)",color:"#fff"}}>🎁 {C.collect}</button>}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}><button className="ex-card ex-btn" onClick={()=>setTab("tasks")} style={{padding:15,textAlign:"left",color:"#202637"}}><div style={{fontSize:23}}>✓</div><b>{C.earnMore}</b><div style={{fontSize:10,color:"#8d96a7",marginTop:3}}>{C.tasksRewards}</div></button><button className="ex-card ex-btn" onClick={()=>setTab("team")} style={{padding:15,textAlign:"left",color:"#202637"}}><div style={{fontSize:23}}>👥</div><b>{C.invite}</b><div style={{fontSize:10,color:"#8d96a7",marginTop:3}}>{C.buildTeam}</div></button></div>
          {giftUnclaimed&&<button className="ex-card ex-btn" onClick={()=>{setGiftOpened(false);setShowGift(true)}} style={{width:"100%",padding:14,marginTop:11,display:"flex",alignItems:"center",gap:11,textAlign:"left",color:"#202637"}}><span style={{fontSize:30}}>🎁</span><span style={{flex:1}}><b>{C.welcomeGift}</b><div style={{fontSize:10,color:"#8d96a7"}}>{C.claimBonus} · {welcomeTon} TON</div></span><span style={{fontSize:21,color:"#5d57e9"}}>›</span></button>}
        </div>}

        {tab==="tasks"&&<div>
          <div style={{marginBottom:15}}><div style={{fontSize:25,fontWeight:800}}>{TC.title}</div><div style={{fontSize:12,color:"#8d96a7"}}>{TC.sub}</div></div>
          {tasksLoading?<div className="ex-card" style={{padding:22,textAlign:"center",color:"#8d96a7"}}>{TC.loading}</div>:taskItems.length===0?<div className="ex-card" style={{padding:25,textAlign:"center",color:"#8d96a7"}}>{TC.empty}</div>:taskItems.map(task=>{const isAd=String(task.category||"").toUpperCase().includes("AD");return <div className="ex-card" key={task.id} style={{padding:15,display:"flex",alignItems:"center",gap:12,marginBottom:10,opacity:task.done?.65:1}}><div style={{width:44,height:44,borderRadius:14,background:isAd?"#fff5e8":"#f0efff",display:"grid",placeItems:"center",fontSize:20}}>{isAd?"📺":"📣"}</div><div style={{flex:1,minWidth:0}}><b style={{fontSize:14,display:"block"}}>{task.label}</b><div style={{fontSize:10,color:"#8d96a7",marginTop:3}}>+{Number(task.reward||0).toLocaleString()} EARNX · {task.category||"TG TASKS"}</div></div><button className="ex-btn" disabled={task.done||taskBusy===task.id} onClick={()=>runTask(task)} style={{padding:"9px 12px",borderRadius:10,background:task.done?"#eafbf4":"#f0efff",color:task.done?"#18a76a":"#5d57e9",whiteSpace:"nowrap"}}>{task.done?"✓ "+TC.done:taskBusy===task.id?"…":isAd?TC.watch:TC.open}</button></div>})}
          <div className="ex-card" style={{padding:16}}><b>{TC.refMilestones}</b>{[1,3,5,10].map(n=>{const done=refStats.total>=n;return <div key={n} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderTop:"1px solid #eef0f5",marginTop:7}}><span style={{width:30,height:30,borderRadius:"50%",background:done?"#eafbf4":"#f3f5f8",color:done?"#18a76a":"#8d96a7",display:"grid",placeItems:"center",fontWeight:800,fontSize:11}}>{done?"✓":n}</span><span style={{flex:1,fontSize:12}}>{n} referral{n>1?"s":""}</span><small style={{color:done?"#18a76a":"#8d96a7"}}>{done?TC.completedLabel:TC.locked}</small></div>})}</div>
        </div>}

        {tab==="team"&&<div>
          <div style={{marginBottom:15}}><div style={{fontSize:25,fontWeight:800}}>Refer & earn</div><div style={{fontSize:12,color:"#8d96a7"}}>Invite friends and grow together</div></div>
          <div style={{borderRadius:24,padding:20,color:"#fff",background:"linear-gradient(135deg,#26294d,#5d57e9)",marginBottom:11}}><div style={{fontSize:11,opacity:.7}}>Referral earnings</div><div style={{fontSize:31,fontWeight:800,margin:"3px 0 14px"}}>{refStats.nova.toFixed(0)} EARNX</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)"}}><div><b>{refStats.total}</b><small style={{display:"block",opacity:.7}}>{L.invited}</small></div><div><b>{refStats.valid}</b><small style={{display:"block",opacity:.7}}>{L.valid}</small></div><div><b>{qualifiedFriends}</b><small style={{display:"block",opacity:.7}}>Active</small></div></div></div>
          <button className="ex-btn" onClick={handleShareReferral} style={{width:"100%",padding:14,borderRadius:14,background:"#5d57e9",color:"#fff",marginBottom:9}}>↗ {L.share}</button><button className="ex-btn" onClick={handleCopyLink} style={{width:"100%",padding:14,borderRadius:14,background:"#fff",border:"1px solid #e5e8ef",color:"#596274",marginBottom:12}}>{copiedLink?"✓ {L.copied}":"⧉ {L.copy}"}</button>
          {refStats.list?.length>0?<div className="ex-card" style={{padding:16}}><b>👥 {L.team}</b>{refStats.list.slice(0,8).map((rr,i)=><div key={rr.id||i} style={{display:"flex",alignItems:"center",gap:9,padding:"10px 0",borderTop:"1px solid #eef0f5",marginTop:7}}><div style={{width:37,height:37,borderRadius:"50%",background:"#f0efff",display:"grid",placeItems:"center"}}>{rr.referred?.photo_url?<img src={rr.referred.photo_url} style={{width:37,height:37,borderRadius:"50%"}}/>:"👤"}</div><div style={{flex:1}}><b style={{fontSize:12}}>{rr.referred?.username?"@"+rr.referred.username:rr.referred?.first_name||"Member"}</b><div style={{fontSize:9,color:rr.status==="active"?"#18a76a":"#8d96a7"}}>{rr.status==="active"?L.active:L.pending}</div></div><small style={{color:"#8d96a7"}}>{rr.active_days_this_month??0}d</small></div>)}</div>:<div className="ex-card" style={{padding:25,textAlign:"center",color:"#8d96a7"}}>👥<div style={{marginTop:5}}>{L.noRefs}</div></div>}
        </div>}

        {tab==="wallet"&&<div>
          <div style={{marginBottom:15}}><div style={{fontSize:25,fontWeight:800}}>Wallet</div><div style={{fontSize:12,color:"#8d96a7"}}>Manage your EarnX and TON</div></div>
          <div className="ex-card" style={{padding:18,marginBottom:11}}><small style={{color:"#8d96a7"}}>{L.availableTon}</small><div style={{fontSize:31,fontWeight:800,margin:"2px 0 14px"}}>{tonBalance.toFixed(5)} TON</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><button className="ex-btn" onClick={()=>setShowSwap(true)} style={{padding:12,borderRadius:13,background:"#f0efff",color:"#5d57e9"}}>↔ {L.convert}</button><button className="ex-btn" onClick={()=>setShowWithdraw(true)} style={{padding:12,borderRadius:13,background:"#5d57e9",color:"#fff"}}>{L.withdraw}</button></div></div>
          <div className="ex-card" style={{padding:18,marginBottom:11}}><small style={{color:"#8d96a7"}}>{L.earnCredits}</small><div style={{fontSize:28,fontWeight:800}}>{novaDisplay} EARNX</div><div style={{fontSize:11,color:"#8d96a7",marginTop:4}}>Mining power: <b style={{color:"#5d57e9"}}>{miningPower.toLocaleString()}</b></div></div>
          <div className="ex-card" style={{padding:16}}>{buyError&&<div style={{background:"#fff1f1",border:"1px solid #ffd0d0",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:11,color:"#c62828"}}>{buyError}</div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><div><b>🛍️ {L.shop}</b><div style={{fontSize:10,color:"#8d96a7"}}>{L.boost}</div></div><TonConnectButton style={{height:30}}/></div>{displayTiers.slice(0,4).map(item=><div key={item.id} style={{display:"flex",alignItems:"center",gap:12,borderTop:"1px solid #eef0f5",padding:"14px 0",minHeight:70}}><span style={{width:46,height:46,borderRadius:14,background:"#f0efff",display:"grid",placeItems:"center",fontSize:20,flexShrink:0}}>⚡</span><span style={{flex:1,minWidth:0}}><b style={{fontSize:15,fontWeight:800,display:"block",lineHeight:1.25}}>{item.power} EARNX</b><small style={{display:"block",color:"#8d96a7",fontSize:12,marginTop:3}}>⚡ {L.dailyMining}: {item.daily} TON/day</small><small style={{display:"block",color:"#8d96a7",fontSize:10,marginTop:2}}>📅 {L.monthlyMining}: {item.month} TON</small></span><button className="ex-btn" onClick={()=>handleBuyTier(item)} style={{padding:"11px 13px",borderRadius:11,background:"#202637",color:"#fff",fontSize:12,fontWeight:800,whiteSpace:"nowrap",minWidth:70}}>{L.buy} · {item.cost} TON</button></div>)}{displayTiers.length===0&&<div style={{padding:15,textAlign:"center",color:"#8d96a7"}}>Shop is loading…</div>}</div>
        </div>}

        {tab==="profile"&&<div>
          <div style={{textAlign:"center",padding:"6px 0 17px"}}><div style={{width:76,height:76,borderRadius:"50%",margin:"0 auto 9px",background:"linear-gradient(135deg,#5d57e9,#8580ff)",display:"grid",placeItems:"center",color:"#fff",fontSize:29,fontWeight:800}}>{(tgUser?.first_name||"E").charAt(0).toUpperCase()}</div><div style={{fontSize:21,fontWeight:800}}>{tgUser?.first_name||"EarnX member"}</div><div style={{fontSize:11,color:"#8d96a7"}}>{tgUser?.username?"@"+tgUser.username:"Telegram member"}</div></div>
          <div className="ex-card" style={{padding:7,marginBottom:11}}>{[["🛍️",L.shop,()=>setTab("wallet")],["↗",L.refer,()=>setTab("team")],["🌐",L.language,()=>setShowLanguage(true)]].map(([ic,label,fn])=><button key={label} className="ex-btn" onClick={fn} style={{width:"100%",display:"flex",alignItems:"center",gap:11,padding:13,border:0,borderBottom:"1px solid #eef0f5",background:"#fff",textAlign:"left",color:"#202637"}}><span style={{width:34,height:34,borderRadius:10,background:"#f2f3ff",display:"grid",placeItems:"center"}}>{ic}</span><span style={{flex:1}}>{label}</span><span style={{color:"#a0a7b4"}}>›</span></button>)}</div>
          <div className="ex-card" style={{padding:16}}><b>⚙️ {L.account}</b><div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #eef0f5",fontSize:11}}><span style={{color:"#8d96a7"}}>{L.telegramId}</span><span>{tgUser?.id||"—"}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #eef0f5",fontSize:11}}><span style={{color:"#8d96a7"}}>Mining power</span><span>{miningPower.toLocaleString()}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",fontSize:11}}><span style={{color:"#8d96a7"}}>{L.status}</span><span style={{color:"#18a76a",fontWeight:800}}>Active</span></div></div>
        </div>}
      </main>

      {showLanguage&&<div onClick={()=>setShowLanguage(false)} style={{position:"fixed",inset:0,zIndex:1200,background:"rgba(20,25,40,.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} className="ex-card" style={{width:"100%",maxWidth:430,maxHeight:"78vh",overflowY:"auto",padding:18,borderRadius:"24px 24px 0 0"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><b style={{fontSize:20}}>🌐 {L.chooseLanguage}</b><button onClick={()=>setShowLanguage(false)} className="ex-btn" style={{border:0,background:"#f1f2f6",borderRadius:10,width:34,height:34}}>×</button></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{Object.entries(LANGUAGES).map(([id,v])=><button key={id} onClick={()=>setLanguage(id)} className="ex-btn" style={{padding:"12px 10px",borderRadius:13,border:lang===id?"2px solid #5d57e9":"1px solid #e5e8ef",background:lang===id?"#f0efff":"#fff",textAlign:"left",color:"#202637"}}><span style={{fontSize:18,marginRight:7}}>{v.flag}</span>{v.name}</button>)}</div></div></div>}
      <nav className="ex-nav"><div style={{display:"flex",maxWidth:430,margin:"0 auto"}}>{navItems.map(item=>{const icon=item.id==="home"?"⌂":item.id==="tasks"?"☷":item.id==="team"?"👥":item.id==="wallet"?"▣":"●";return <button key={item.id} className={tab===item.id?"active":""} onClick={()=>setTab(item.id)}><span style={{fontSize:21,lineHeight:1}}>{icon}</span><span>{item.label}</span></button>})}</div></nav>

      {showSwap&&<SwapModal onClose={()=>setShowSwap(false)} hashes={hashes} onSwapComplete={(rr)=>{if(rr?.hashes!=null)setHashes(Number(rr.hashes));if(rr?.tonBalance!=null)setTonBalance(Number(rr.tonBalance));}}/>}
      {showWithdraw&&<WithdrawModal onClose={()=>setShowWithdraw(false)} tonBalance={tonBalance} qualifiedFriends={qualifiedFriends} onGoSwap={()=>setShowSwap(true)} onInvite={handleShareReferral} onWithdrawComplete={()=>{setTonBalance(0);setShowWithdraw(false);}} minWithdrawTon={minWithdrawTon}/>}
    </div>
  );
}
