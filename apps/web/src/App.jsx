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

const LANGUAGES={
  en:{name:"English",flag:"🇬🇧",home:"Home",tasks:"Tasks",refer:"Refer",wallet:"Wallet",profile:"Profile",shop:"EarnX Shop",boost:"Boost your mining rate",refTitle:"Invite & earn",refSub:"Invite friends and grow together",refReward:"Referral earnings",invited:"Invited",valid:"Valid",active:"Active",share:"Share invite",copy:"Copy invite link",copied:"Link copied",team:"Your team",pending:"Pending",noRefs:"No referrals yet",language:"Language",chooseLanguage:"Choose language",account:"Account",telegramId:"Telegram ID",status:"Status",convert:"Convert",withdraw:"Withdraw",availableTon:"Available TON",earnCredits:"EarnX credits",dailyMining:"Daily mining",monthlyMining:"Monthly mining",buy:"Buy"},
  ar:{name:"العربية",flag:"🇸🇦",home:"الرئيسية",tasks:"المهام",refer:"الإحالات",wallet:"المحفظة",profile:"الملف الشخصي",shop:"متجر EarnX",boost:"طوّر سرعة التعدين",refTitle:"ادعُ واربح",refSub:"ادعُ أصدقاءك واربح معًا",refReward:"أرباح الإحالات",invited:"الدعوات",valid:"الصحيحة",active:"النشطة",share:"مشاركة الدعوة",copy:"نسخ رابط الدعوة",copied:"تم نسخ الرابط",team:"فريقك",pending:"قيد الانتظار",noRefs:"لا توجد إحالات بعد",language:"اللغة",chooseLanguage:"اختر اللغة",account:"الحساب",telegramId:"معرّف تيليجرام",status:"الحالة",convert:"تحويل",withdraw:"سحب",availableTon:"رصيد TON المتاح",earnCredits:"رصيد EarnX",dailyMining:"التعدين اليومي",monthlyMining:"التعدين الشهري",buy:"شراء"}
};

const HOME_COPY={
  en:{welcome:"Welcome back",totalBalance:"Total balance",earnxCredits:"TON balance",referrals:"Referrals",miningCenter:"Mining center",earnEvery:"Earn every 24 hours",balance:"TON BALANCE",credits:"TON",energy:"Mining rate",miningEnergy:"TON per day",tonBalance:"TON BALANCE",miningPower:"MINING RATE",power:"rate",nextReward:"NEXT MINING REWARD",session:"24h session",start:"Start earning",progress:"Mining in progress",collect:"Collect reward",accumulated:"Accumulated",perSession:"per session",earnMore:"Earn more",tasksRewards:"Tasks & rewards",invite:"Invite friends",buildTeam:"Build your team",welcomeGift:"Welcome gift",claimBonus:"Claim your bonus"},
  ar:{welcome:"مرحبًا بعودتك",totalBalance:"إجمالي الرصيد",earnxCredits:"رصيد TON",referrals:"الإحالات",miningCenter:"مركز التعدين",earnEvery:"اكسب كل 24 ساعة",balance:"رصيد TON",credits:"TON",energy:"معدل التعدين",miningEnergy:"TON يوميًا",tonBalance:"رصيد TON",miningPower:"معدل التعدين",power:"المعدل",nextReward:"مكافأة التعدين القادمة",session:"جلسة 24 ساعة",start:"ابدأ التعدين",progress:"التعدين جارٍ",collect:"استلام المكافأة",accumulated:"المجموع المكتسب",perSession:"لكل جلسة",earnMore:"اربح أكثر",tasksRewards:"المهام والمكافآت",invite:"ادعُ أصدقاءك",buildTeam:"كوّن فريقك",welcomeGift:"هدية الترحيب",claimBonus:"استلم مكافأتك"}
};
const TASK_COPY={
  en:{title:"Tasks & Rewards",sub:"Complete tasks and watch rewarded ads to earn TON",loading:"Loading…",empty:"No tasks available right now.",done:"Done",watch:"Watch",open:"Open",completed:"Task completed! +",refMilestones:"Referral milestones",completedLabel:"Completed",locked:"Locked"},
  ar:{title:"المهام والمكافآت",sub:"أكمل المهام وشاهد الإعلانات لكسب TON",loading:"جارٍ التحميل…",empty:"لا توجد مهام متاحة الآن.",done:"تم",watch:"مشاهدة",open:"فتح",completed:"تم إكمال المهمة! +",refMilestones:"مراحل الإحالة",completedLabel:"مكتمل",locked:"مقفل"}
};
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

function genActivity(){ return null; }

function WithdrawModal({onClose,tonBalance,qualifiedFriends,onInvite,onWithdrawComplete,minWithdrawTon}){
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
            <div style={{fontSize:13,color:T.muted,lineHeight:1.6}}>You need a minimum of <span style={{color:T.gold,fontWeight:700}}>{MIN} TON</span> to withdraw.<br/>Keep mining to grow your TON balance.</div>
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
  const [lang,setLang]=useState(()=>localStorage.getItem("earnx_lang") === "ar" ? "ar" : "en"||"en");
  const [showLanguage,setShowLanguage]=useState(false);
  const L=LANGUAGES[lang]||LANGUAGES.en;
  const C=HOME_COPY[lang]||HOME_COPY.en;
  const TC=TASK_COPY[lang]||TASK_COPY.en;
  const setLanguage=(next)=>{const safe=next==="ar"?"ar":"en";setLang(safe);localStorage.setItem("earnx_lang",safe);setShowLanguage(false);};
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
  const [dailyAdCount,setDailyAdCount]=useState(0);
  const userDbId=useRef(null);
  const [showWithdraw,setShowWithdraw]=useState(false);
  const [withdrawAddress,setWithdrawAddress]=useState("");
  const [withdrawBusy,setWithdrawBusy]=useState(false);
  const [withdrawError,setWithdrawError]=useState("");
    // Mining state — persisted in localStorage so it survives page reloads/quit
  const MINING_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours — matches Dulce CANDY 24h production loop
  const [miningTick,setMiningTick]=useState(0);
  const [miningStartedAt, setMiningStartedAt] = useState(() => {
    const v = localStorage.getItem("nm_mining_started_at");
    return v ? Number(v) : null;
  });
  const miningActive = miningStartedAt !== null && (Date.now() - miningStartedAt) < MINING_DURATION_MS;
  const claimReady   = miningStartedAt !== null && (Date.now() - miningStartedAt) >= MINING_DURATION_MS;
  const miningSessionReward=Number(MINING.dailyTon(miningPower)||0);
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
    const userId=window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    setTasksLoading(true);
    fetch((import.meta.env.VITE_API_BASE_URL??"")+"/adsgram/daily-status?userid="+encodeURIComponent(String(userId||"")))
      .then(r=>r.json()).then(x=>{ if(alive) setDailyAdCount(Number(x?.dailyCount||0)); })
      .catch(()=>{ if(alive) setDailyAdCount(0); })
      .finally(()=>{ if(alive) setTasksLoading(false); });
    setTaskItems([{id:"daily_ads",label:"Watch Ads",reward:0.0013,category:"ADS",active:true,done:false}]);
    return ()=>{alive=false;};
  },[tab,userLoaded]);

  async function runTask(task){
    if(taskBusy || dailyAdCount>=20) return;
    setTaskBusy(task.id);
    try{
      await new Promise((resolve,reject)=>{
        const before=dailyAdCount;
        watchAd(async ()=>{
          try{
            const uid=window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
            const r=await fetch((import.meta.env.VITE_API_BASE_URL??"")+"/adsgram/daily-status?userid="+encodeURIComponent(String(uid||"")));
            const x=await r.json();
            setDailyAdCount(Number(x?.dailyCount||before));
            resolve();
          }catch(e){reject(e);}
        },"start_mining");
      });
      const fresh=await api.me();
      if(fresh?.user) setTonBalance(Number(fresh.user.ton_balance??0));
    }catch(e){ alert(e?.message||"Ad could not be completed."); }
    finally{setTaskBusy(null);}
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
      alert("Payment confirmed! Your TON mining rate has been increased.");
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
    {id:"withdraw",icon:"wallet",label:"Withdraw"},
    {id:"history",icon:"rank",label:"History"},
    {id:"team",icon:"users",label:"Invite"},
    {id:"bonus",icon:"gift",label:"Bonus"},
  ];

  const novaDisplay=tonBalance.toFixed(5)+" TON";

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

      <header style={{background:"#fff",borderBottom:"1px solid #eceef4",padding:"16px 17px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:40,height:40,borderRadius:13,background:"linear-gradient(135deg,#5d57e9,#8580ff)",color:"#fff",display:"grid",placeItems:"center",fontSize:18,fontWeight:800}}>E</div><div><b style={{fontSize:17}}>EarnX</b><div style={{fontSize:10,color:"#929aaa"}}>Rewards hub</div></div></div>
        <button className="ex-btn" onClick={()=>setTab("bonus")} style={{width:40,height:40,borderRadius:"50%",background:"#f0efff",color:"#5d57e9",fontSize:17}}>👤</button>
      </header>

      <main style={{padding:"18px 16px 94px",animation:"exIn .25s ease"}}>
        {tab==="home"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",marginBottom:14}}><div><div style={{fontSize:12,color:"#8d96a7"}}>{C.welcome}</div><div style={{fontSize:25,fontWeight:800,letterSpacing:-.7}}>{tgUser?.first_name||"EarnX member"} 👋</div></div><div style={{fontSize:10,color:"#18a76a",fontWeight:800}}>● LIVE</div></div>
          <section style={{borderRadius:25,padding:21,color:"#fff",background:"linear-gradient(135deg,#5d57e9,#716af1 55%,#8982ff)",boxShadow:"0 14px 34px rgba(93,87,233,.23)",position:"relative",overflow:"hidden",marginBottom:14}}>
            <div style={{position:"absolute",width:190,height:190,borderRadius:"50%",background:"rgba(255,255,255,.09)",right:-65,top:-90}}/>
            <div style={{fontSize:12,opacity:.8}}>{C.totalBalance}</div><div style={{fontSize:39,fontWeight:800,letterSpacing:-1.5,margin:"3px 0 2px"}}>{novaDisplay}</div><div style={{fontSize:10,opacity:.72}}>TON</div>
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
            <div style={{background:"#f0efff",borderRadius:15,padding:12,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}><div><div style={{fontSize:9,color:"#8d96a7"}}>{C.nextReward}</div><b style={{fontSize:18,color:"#5d57e9"}}>+{MINING.dailyTon(miningPower).toFixed(5)} TON</b></div><div style={{fontSize:10,color:"#8d96a7",textAlign:"right"}}>{C.session}</div></div>
            {!miningActive&&!claimReady&&<button className="ex-btn" onClick={startMining} style={{width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#5d57e9,#817bff)",color:"#fff"}}>{C.start}</button>}
            {miningActive&&!claimReady&&<div style={{background:"#effbf6",border:"1px solid #ccefe0",borderRadius:14,padding:"16px 12px",textAlign:"center"}}><div style={{fontSize:10,color:"#678176",marginBottom:3}}>{C.accumulated}</div><b style={{fontSize:28,color:"#18a76a"}}>+{miningAccumulated.toFixed(5)} TON</b><div style={{fontSize:10,color:"#678176",marginTop:6}}>{C.progress} · {formatTime(Math.max(0,Math.ceil((MINING_DURATION_MS-(Date.now()-miningStartedAt))/1000)))}</div></div>}
            {claimReady&&<button className="ex-btn" onClick={claimHashes} style={{width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#18a76a,#36c98d)",color:"#fff"}}>🎁 {C.collect}</button>}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}><button className="ex-card ex-btn" onClick={()=>setTab("tasks")} style={{padding:15,textAlign:"left",color:"#202637"}}><div style={{fontSize:23}}>✓</div><b>{C.earnMore}</b><div style={{fontSize:10,color:"#8d96a7",marginTop:3}}>{C.tasksRewards}</div></button><button className="ex-card ex-btn" onClick={()=>setTab("team")} style={{padding:15,textAlign:"left",color:"#202637"}}><div style={{fontSize:23}}>👥</div><b>{C.invite}</b><div style={{fontSize:10,color:"#8d96a7",marginTop:3}}>{C.buildTeam}</div></button></div>
          {giftUnclaimed&&<button className="ex-card ex-btn" onClick={()=>setTab("bonus")} style={{width:"100%",padding:14,marginTop:11,display:"flex",alignItems:"center",gap:11,textAlign:"left",color:"#202637"}}><span style={{fontSize:30}}>🎁</span><span style={{flex:1}}><b>{C.welcomeGift}</b><div style={{fontSize:10,color:"#8d96a7"}}>{C.claimBonus} · {welcomeTon} TON</div></span><span style={{fontSize:21,color:"#5d57e9"}}>›</span></button>}
        </div>}

        {tab==="history"&&<div>
          <div style={{marginBottom:15}}><div style={{fontSize:25,fontWeight:800}}>History</div><div style={{fontSize:12,color:"#8d96a7"}}>Your recent earning activity</div></div>
          <div className="ex-card" style={{padding:18,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><b>Current balance</b><b style={{color:"#18a76a"}}>{tonBalance.toFixed(5)} TON</b></div>
            <div style={{display:"grid",gap:9}}>
              <div style={{padding:13,borderRadius:13,background:"#f6f7fb",display:"flex",justifyContent:"space-between"}}><span>Mining rate</span><b>{miningPower.toLocaleString()}</b></div>
              <div style={{padding:13,borderRadius:13,background:"#f6f7fb",display:"flex",justifyContent:"space-between"}}><span>Referrals</span><b>{refStats.total}</b></div>
              <div style={{padding:13,borderRadius:13,background:"#f6f7fb",display:"flex",justifyContent:"space-between"}}><span>Active friends</span><b>{qualifiedFriends}</b></div>
            </div>
          </div>
          <div className="ex-card" style={{padding:18}}>
            <b>Activity</b>
            <div style={{padding:"28px 8px 12px",textAlign:"center",color:"#8d96a7",fontSize:12}}>Your real mining and withdrawal records will appear here as the account creates them.</div>
          </div>
        </div>

        {tab==="team"&&<div>
          <div style={{marginBottom:15}}><div style={{fontSize:25,fontWeight:800}}>Refer & earn</div><div style={{fontSize:12,color:"#8d96a7"}}>Invite friends and grow together</div></div>
          <div style={{borderRadius:24,padding:20,color:"#fff",background:"linear-gradient(135deg,#26294d,#5d57e9)",marginBottom:11}}><div style={{fontSize:11,opacity:.7}}>Referral earnings</div><div style={{fontSize:31,fontWeight:800,margin:"3px 0 14px"}}>{refStats.nova.toFixed(0)} EARNX</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)"}}><div><b>{refStats.total}</b><small style={{display:"block",opacity:.7}}>{L.invited}</small></div><div><b>{refStats.valid}</b><small style={{display:"block",opacity:.7}}>{L.valid}</small></div><div><b>{qualifiedFriends}</b><small style={{display:"block",opacity:.7}}>Active</small></div></div></div>
          <button className="ex-btn" onClick={handleShareReferral} style={{width:"100%",padding:14,borderRadius:14,background:"#5d57e9",color:"#fff",marginBottom:9}}>↗ {L.share}</button><button className="ex-btn" onClick={handleCopyLink} style={{width:"100%",padding:14,borderRadius:14,background:"#fff",border:"1px solid #e5e8ef",color:"#596274",marginBottom:12}}>{copiedLink?"✓ {L.copied}":"⧉ {L.copy}"}</button>
          {refStats.list?.length>0?<div className="ex-card" style={{padding:16}}><b>👥 {L.team}</b>{refStats.list.slice(0,8).map((rr,i)=><div key={rr.id||i} style={{display:"flex",alignItems:"center",gap:9,padding:"10px 0",borderTop:"1px solid #eef0f5",marginTop:7}}><div style={{width:37,height:37,borderRadius:"50%",background:"#f0efff",display:"grid",placeItems:"center"}}>{rr.referred?.photo_url?<img src={rr.referred.photo_url} style={{width:37,height:37,borderRadius:"50%"}}/>:"👤"}</div><div style={{flex:1}}><b style={{fontSize:12}}>{rr.referred?.username?"@"+rr.referred.username:rr.referred?.first_name||"Member"}</b><div style={{fontSize:9,color:rr.status==="active"?"#18a76a":"#8d96a7"}}>{rr.status==="active"?L.active:L.pending}</div></div><small style={{color:"#8d96a7"}}>{rr.active_days_this_month??0}d</small></div>)}</div>:<div className="ex-card" style={{padding:25,textAlign:"center",color:"#8d96a7"}}>👥<div style={{marginTop:5}}>{L.noRefs}</div></div>}
        </div>}

        {tab==="withdraw"&&<div>
          <div style={{marginBottom:15}}><div style={{fontSize:25,fontWeight:800}}>Withdraw</div><div style={{fontSize:12,color:"#8d96a7"}}>Withdraw your available TON</div></div>
          <div className="ex-card" style={{padding:18,marginBottom:12}}>
            <small style={{color:"#8d96a7"}}>Available balance</small><div style={{fontSize:34,fontWeight:800,margin:"4px 0 16px"}}>{tonBalance.toFixed(5)} TON</div>
            <div style={{padding:14,borderRadius:13,background:"#f6f7fb",marginBottom:12}}><div style={{fontSize:10,color:"#8d96a7",marginBottom:6}}>TON WALLET ADDRESS</div><input value={withdrawAddress} onChange={e=>{setWithdrawAddress(e.target.value);setWithdrawError("");}} placeholder="UQ... or EQ..." style={{width:"100%",border:0,outline:0,background:"transparent",fontFamily:"inherit",fontSize:14}}/></div>
            {withdrawError&&<div style={{padding:11,borderRadius:11,background:"#fff1f1",color:"#c62828",fontSize:11,marginBottom:10}}>{withdrawError}</div>}
            <button className="ex-btn" disabled={withdrawBusy||!withdrawAddress.trim()||tonBalance<=0} onClick={async()=>{setWithdrawBusy(true);setWithdrawError("");try{await api.requestWithdraw(tonBalance,withdrawAddress.trim());setTonBalance(0);setWithdrawAddress("");}catch(e){setWithdrawError(e?.message||"Withdrawal request failed.");}finally{setWithdrawBusy(false);}}} style={{width:"100%",padding:14,borderRadius:14,background:"#5d57e9",color:"#fff",opacity:(withdrawBusy||!withdrawAddress.trim()||tonBalance<=0)?.55:1}}>{withdrawBusy?"Submitting…":"Withdraw TON"}</button>
          </div>
          <div className="ex-card" style={{padding:16,fontSize:11,color:"#8d96a7"}}>Minimum withdrawal: {minWithdrawTon} TON · Referral requirement: 5 active friends.</div>
        </div>

        {tab==="bonus"&&<div>
          <div style={{marginBottom:15}}><div style={{fontSize:25,fontWeight:800}}>Bonus</div><div style={{fontSize:12,color:"#8d96a7"}}>Claim your available welcome reward</div></div>
          <div className="ex-card" style={{padding:22,textAlign:"center",background:"linear-gradient(135deg,#f0efff,#ffffff)"}}>
            <div style={{fontSize:58,marginBottom:8}}>🎁</div><div style={{fontSize:20,fontWeight:800}}>Welcome Bonus</div><div style={{fontSize:12,color:"#8d96a7",margin:"6px 0 18px"}}>Your account bonus</div><div style={{fontSize:36,fontWeight:800,color:"#5d57e9",marginBottom:18}}>+{welcomeTon} TON</div>
            {giftUnclaimed?<button className="ex-btn" onClick={async()=>{try{await api.claimGift?.();const fresh=await api.me();if(fresh?.user){setTonBalance(Number(fresh.user.ton_balance??0));setNova(Number(fresh.user.nova??0));setHashes(Number(fresh.user.hashes??0));setMiningPower(miningPowerFromNova(Number(fresh.user.nova??0)));}setGiftUnclaimed(false);}catch(e){setBuyError(e?.message||"Could not claim the bonus.");}}} style={{width:"100%",padding:14,borderRadius:14,background:"#5d57e9",color:"#fff"}}>Claim Bonus</button>:<div style={{padding:12,borderRadius:12,background:"#effbf6",color:"#18a76a",fontWeight:700}}>✓ Bonus already claimed</div>}
          </div>
        </div>
      </main>

      {showLanguage&&<div onClick={()=>setShowLanguage(false)} style={{position:"fixed",inset:0,zIndex:1200,background:"rgba(20,25,40,.5)",backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} className="ex-card" style={{width:"100%",maxWidth:430,maxHeight:"78vh",overflowY:"auto",padding:18,borderRadius:"24px 24px 0 0"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><b style={{fontSize:20}}>🌐 {L.chooseLanguage}</b><button onClick={()=>setShowLanguage(false)} className="ex-btn" style={{border:0,background:"#f1f2f6",borderRadius:10,width:34,height:34}}>×</button></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{Object.entries(LANGUAGES).map(([id,v])=><button key={id} onClick={()=>setLanguage(id)} className="ex-btn" style={{padding:"12px 10px",borderRadius:13,border:lang===id?"2px solid #5d57e9":"1px solid #e5e8ef",background:lang===id?"#f0efff":"#fff",textAlign:"left",color:"#202637"}}><span style={{fontSize:18,marginRight:7}}>{v.flag}</span>{v.name}</button>)}</div></div></div>}
      <nav className="ex-nav"><div style={{display:"flex",maxWidth:430,margin:"0 auto"}}>{navItems.map(item=>{const icon=item.id==="home"?"⌂":item.id==="withdraw"?"⇩":item.id==="history"?"◷":item.id==="team"?"👥":"🎁";return <button key={item.id} className={tab===item.id?"active":""} onClick={()=>setTab(item.id)}><span style={{fontSize:21,lineHeight:1}}>{icon}</span><span>{item.label}</span></button>})}</div></nav>


    </div>
  );
}