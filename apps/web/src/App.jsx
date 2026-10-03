// EarnX v4 - circular nav + all EARNX labels - All EARNX labels correct
import { useState, useEffect, useRef } from "react";
import EarnXAdmin from "./pages/admin/index.jsx";
import { getTelegramUser, initTelegram } from "./lib/telegram.js";
import { authenticate } from "./lib/auth.js";
import { api } from "./lib/api.js";
import { supabase } from "./lib/supabase.js";
import { miningPowerFromNova, tierFromNova, MINING, SHOP } from "@earnx/shared";
import { useTonConnectUI, useTonAddress, TonConnectButton } from "@tonconnect/ui-react";

const T = {
  bg:"#080b0f", card:"#0d1117", gold:"#55e7ff", goldDim:"#7c5cff",
  goldGlow:"rgba(85,231,255,0.18)", goldFaint:"rgba(85,231,255,0.07)",
  green:"#6dffb8", greenDim:"#176b52", text:"#f0ede6", muted:"#6b7a6b",
  red:"#ff4d4d", blue:"#4da6ff",
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
          <div style={{fontFamily:"'Orbitron'",fontSize:12,color:T.gold,fontWeight:700}}>1 HASH = {rate} TON</div>
        </div>
        <div style={{background:"rgba(0,0,0,0.4)",border:"1px solid #1e2a1e",borderRadius:12,padding:14,marginBottom:8}}>
          <div style={{fontSize:11,color:T.muted,marginBottom:6,letterSpacing:1}}>FROM (ENERGY)</div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <input type="number" placeholder="0.00" value={amount} onChange={e=>{setAmount(e.target.value);setSwapError(null);}} style={{flex:1,background:"transparent",border:"none",outline:"none",fontFamily:"'Orbitron'",fontSize:22,fontWeight:700,color:T.text,width:"100%"}}/>
            <button onClick={()=>setAmount(hashes.toFixed(8))} style={{background:T.goldFaint,border:`1px solid ${T.goldDim}`,borderRadius:8,padding:"4px 10px",color:T.gold,fontSize:11,cursor:"pointer",fontFamily:"'Rajdhani'",fontWeight:700}}>MAX</button>
          </div>
          <div style={{fontSize:11,color:T.muted,marginTop:4}}>Available: {hashes.toFixed(8)} ENERGY</div>
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
  const [nova,setNova]=useState(0);          // new users start at 0
  const [hashes,setHashes]=useState(0);      // new users start at 0
  const [tonBalance,setTonBalance]=useState(0); // new users start at 0
  const [miningPower,setMiningPower]=useState(1000);
  const [adsEnabled,setAdsEnabled]=useState(false);
  const [adTriggers,setAdTriggers]=useState({start_mining:false,collect_mining:false});
  const [userLoaded,setUserLoaded]=useState(false);
  const [shopTiers,setShopTiers]=useState(SHOP.TIERS);
  const [shopWallet,setShopWallet]=useState("");
  const ADSGRAM_BLOCK_ID = import.meta.env.VITE_ADSGRAM_BLOCK_ID || "";
  const userDbId=useRef(null);
  const [showWithdraw,setShowWithdraw]=useState(false);
  const [showSwap,setShowSwap]=useState(false);
  // Mining state — persisted in localStorage so it survives page reloads/quit
  const MINING_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours — matches Dulce CANDY 24h production loop
  const [miningStartedAt, setMiningStartedAt] = useState(() => {
    const v = localStorage.getItem("nm_mining_started_at");
    return v ? Number(v) : null;
  });
  const miningActive = miningStartedAt !== null && (Date.now() - miningStartedAt) < MINING_DURATION_MS;
  const claimReady   = miningStartedAt !== null && (Date.now() - miningStartedAt) >= MINING_DURATION_MS;
  const miningTimer=useRef(null);
  const authResultRef=useRef(null);
  const [qualifiedFriends, setQualifiedFriends] = useState(0);
  const [claimedMilestones, setClaimedMilestones] = useState([]);
  const [minWithdrawTon, setMinWithdrawTon] = useState(2.0);
  const [showGift, setShowGift] = useState(false);
  const [giftUnclaimed, setGiftUnclaimed] = useState(false); // shows banner on homepage
  const [showStreak, setShowStreak] = useState(false);
  const [streakDays, setStreakDays] = useState([]);   // array of {day, nova, ton, claimed}
  const [streakLoading, setStreakLoading] = useState(false);
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

        // Load streak in background — never blocks app load
        setTimeout(async () => {
          try {
            const sd = await api.getStreak();
            if (sd?.days && sd.days.length > 0) {
              setStreakDays(sd.days);
              const today = sd.days.find(d => d.isToday);
              if (today && !today.claimed) setShowStreak(true);
            }
          } catch(_) {}
        }, 1500); // 1.5s delay so app fully renders first
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
    if(!ADSGRAM_BLOCK_ID || !window.Adsgram?.init){
      alert("Rewarded ads are not configured yet. Please try again later.");
      return;
    }
    try{
      const controller=window.Adsgram.init({blockId:ADSGRAM_BLOCK_ID});
      const result=await controller.show();
      if(result?.done !== false) onComplete();
      else alert("Ad was not completed, so no reward was granted.");
    }catch(err){
      console.warn("[EarnX] AdsGram reward not completed:",err);
      alert("The ad could not be completed. No reward was granted.");
    }
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
    if(!userDbId.current){
      setBuyError("Your EarnX account is still loading. Please try again.");
      return;
    }

    setBuyingTierId(tier.id);
    try {
      const nanotons = BigInt(Math.round(Number(tier.cost) * 1_000_000_000)).toString();
      const randomId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const paymentComment = `EarnX Shop|${userDbId.current}|${tier.id}|${randomId}`;
      // Build the standard TON text-comment payload without importing @ton/core
      // in the browser. This keeps the payment button reliable inside Telegram WebView.
      const commentBytes = new TextEncoder().encode(paymentComment);
      const body = new Uint8Array(4 + commentBytes.length);
      body[0] = 0; body[1] = 0; body[2] = 0; body[3] = 0;
      body.set(commentBytes, 4);
      let binary = "";
      for (let i = 0; i < body.length; i++) binary += String.fromCharCode(body[i]);
      const payload = btoa(binary);

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
      setNova(Number(purchase.nova ?? nova));
      setMiningPower(Number(purchase.miningPower ?? miningPower));
      alert(`✅ Payment confirmed! +${tier.power} EARNX has been added to your account.`);
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

      {showStreak&&streakDays.length>0&&<div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(20,25,40,.55)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}} onClick={()=>setShowStreak(false)}>
        <div className="ex-card" onClick={e=>e.stopPropagation()} style={{padding:22,width:"100%",maxWidth:390}}>
          <div style={{textAlign:"center",marginBottom:16}}><div style={{fontSize:34}}>🎁</div><b style={{fontSize:20}}>Daily rewards</b><div style={{fontSize:12,color:"#8d96a7",marginTop:4}}>Claim today's reward to keep your streak.</div></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{streakDays.map(d=>{const label=d.ton>0?d.ton+" TON":(d.nova>=1000?d.nova/1000+"K":d.nova);return <button key={d.day} className="ex-btn" onClick={async()=>{if(!d.isToday||d.claimed)return;try{const rr=await api.claimStreak(d.day);if(rr?.ok){setStreakDays(p=>p.map(x=>x.day===d.day?{...x,claimed:true}:x));if(rr.nova)setNova(p=>p+rr.nova);if(rr.ton)setTonBalance(p=>p+rr.ton);setShowStreak(false)}}catch(e){alert(e?.message||"Failed")}}} style={{padding:"10px 3px",borderRadius:13,border:`1px solid ${d.claimed?"#bcebd8":d.isToday?"#635ced":"#e9ecf3"}`,background:d.claimed?"#effbf6":d.isToday?"#f0efff":"#fafbfc",color:d.claimed?"#16a66a":d.isToday?"#5d57e9":"#8d96a7"}}><small>DAY {d.day}</small><div style={{fontSize:11,marginTop:4}}>{d.claimed?"✓":label}</div></button>})}</div>
          <button className="ex-btn" onClick={()=>setShowStreak(false)} style={{width:"100%",marginTop:15,padding:12,borderRadius:13,background:"#f1f3f7",color:"#596274"}}>Close</button>
        </div>
      </div>}

      {showGift&&<div style={{position:"fixed",inset:0,zIndex:1001,background:"rgba(20,25,40,.55)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:18}}>
        <div className="ex-card" style={{padding:28,width:"100%",maxWidth:350,textAlign:"center"}}>
          {!giftOpened?<><div onClick={()=>{setGiftOpened(true);api.claimGift?.().catch(()=>{})}} style={{fontSize:75,cursor:"pointer"}}>🎁</div><b style={{fontSize:20}}>Welcome to EarnX</b><div style={{fontSize:12,color:"#8d96a7",marginTop:5}}>Tap the gift to reveal your bonus.</div></>:<><div style={{fontSize:50}}>🎉</div><b style={{fontSize:20}}>Reward unlocked</b><div style={{fontSize:12,color:"#8d96a7",marginTop:5}}>Welcome bonus</div><div style={{fontSize:34,fontWeight:800,color:"#5d57e9",margin:"8px 0 16px"}}>+{welcomeTon} TON</div><button className="ex-btn" onClick={()=>{setShowGift(false);setGiftUnclaimed(false);setTonBalance(p=>p+welcomeTon)}} style={{width:"100%",padding:13,borderRadius:14,background:"linear-gradient(135deg,#5d57e9,#857fff)",color:"#fff"}}>Claim reward</button></>}
        </div>
      </div>}

      <header style={{background:"#fff",borderBottom:"1px solid #eceef4",padding:"16px 17px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:40,height:40,borderRadius:13,background:"linear-gradient(135deg,#5d57e9,#8580ff)",color:"#fff",display:"grid",placeItems:"center",fontSize:18,fontWeight:800}}>E</div><div><b style={{fontSize:17}}>EarnX</b><div style={{fontSize:10,color:"#929aaa"}}>Rewards hub</div></div></div>
        <button className="ex-btn" onClick={()=>setTab("profile")} style={{width:40,height:40,borderRadius:"50%",background:"#f0efff",color:"#5d57e9",fontSize:17}}>👤</button>
      </header>

      <main style={{padding:"18px 16px 94px",animation:"exIn .25s ease"}}>
        {tab==="home"&&<div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"end",marginBottom:14}}><div><div style={{fontSize:12,color:"#8d96a7"}}>Welcome back</div><div style={{fontSize:25,fontWeight:800,letterSpacing:-.7}}>{tgUser?.first_name||"EarnX member"} 👋</div></div><div style={{fontSize:10,color:"#18a76a",fontWeight:800}}>● LIVE</div></div>
          <section style={{borderRadius:25,padding:21,color:"#fff",background:"linear-gradient(135deg,#5d57e9,#716af1 55%,#8982ff)",boxShadow:"0 14px 34px rgba(93,87,233,.23)",position:"relative",overflow:"hidden",marginBottom:14}}>
            <div style={{position:"absolute",width:190,height:190,borderRadius:"50%",background:"rgba(255,255,255,.09)",right:-65,top:-90}}/>
            <div style={{fontSize:12,opacity:.8}}>Total balance</div><div style={{fontSize:39,fontWeight:800,letterSpacing:-1.5,margin:"3px 0 2px"}}>{novaDisplay}</div><div style={{fontSize:10,opacity:.72}}>EARNX credits</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:19}}><div><b>{tonBalance.toFixed(3)}</b><div style={{fontSize:9,opacity:.7}}>TON</div></div><div><b>{refStats.total}</b><div style={{fontSize:9,opacity:.7}}>Referrals</div></div><div><b>{qualifiedFriends}</b><div style={{fontSize:9,opacity:.7}}>Active</div></div></div>
          </section>

          <div className="ex-card" style={{padding:17,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><b style={{fontSize:18}}>Mining center</b><div style={{fontSize:11,color:"#8d96a7"}}>Earn every 24 hours</div></div><div style={{width:40,height:40,borderRadius:13,background:"#f0efff",display:"grid",placeItems:"center"}}>⚡</div></div>
            <div style={{background:"#f6f7fb",borderRadius:15,padding:14,display:"flex",justifyContent:"space-between",marginBottom:11}}><div><div style={{fontSize:10,color:"#8d96a7"}}>Session reward</div><b style={{fontSize:19,color:"#5d57e9"}}>+{MINING.hashesPerSession(miningPower).toFixed(4)}</b><div style={{fontSize:10,color:"#8d96a7"}}>EARNX</div></div><div style={{textAlign:"right"}}><div style={{fontSize:10,color:"#8d96a7"}}>Power</div><b>{miningPower.toLocaleString()}</b></div></div>
            {!miningActive&&!claimReady&&<button className="ex-btn" onClick={startMining} style={{width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#5d57e9,#817bff)",color:"#fff"}}>▶ Start earning</button>}
            {miningActive&&!claimReady&&<div style={{background:"#effbf6",border:"1px solid #ccefe0",borderRadius:14,padding:12,textAlign:"center"}}><div style={{fontSize:10,color:"#678176"}}>Mining in progress</div><b style={{fontSize:23,color:"#18a76a"}}>{formatTime(Math.max(0,Math.ceil((MINING_DURATION_MS-(Date.now()-miningStartedAt))/1000)))}</b></div>}
            {claimReady&&<button className="ex-btn" onClick={claimHashes} style={{width:"100%",padding:14,borderRadius:14,background:"linear-gradient(135deg,#18a76a,#36c98d)",color:"#fff"}}>🎁 Collect reward</button>}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}><button className="ex-card ex-btn" onClick={()=>setTab("tasks")} style={{padding:15,textAlign:"left",color:"#202637"}}><div style={{fontSize:23}}>✓</div><b>Earn more</b><div style={{fontSize:10,color:"#8d96a7",marginTop:3}}>Tasks & rewards</div></button><button className="ex-card ex-btn" onClick={()=>setTab("team")} style={{padding:15,textAlign:"left",color:"#202637"}}><div style={{fontSize:23}}>👥</div><b>Invite friends</b><div style={{fontSize:10,color:"#8d96a7",marginTop:3}}>Build your team</div></button></div>
          {giftUnclaimed&&<button className="ex-card ex-btn" onClick={()=>{setGiftOpened(false);setShowGift(true)}} style={{width:"100%",padding:14,marginTop:11,display:"flex",alignItems:"center",gap:11,textAlign:"left",color:"#202637"}}><span style={{fontSize:30}}>🎁</span><span style={{flex:1}}><b>Welcome gift</b><div style={{fontSize:10,color:"#8d96a7"}}>Claim your {welcomeTon} TON bonus</div></span><span style={{fontSize:21,color:"#5d57e9"}}>›</span></button>}
        </div>}

        {tab==="tasks"&&<div>
          <div style={{marginBottom:15}}><div style={{fontSize:25,fontWeight:800}}>Tasks</div><div style={{fontSize:12,color:"#8d96a7"}}>Simple ways to grow your EarnX balance</div></div>
          {[["📅","Daily rewards","Claim today's streak reward",()=>setShowStreak(true),"Open"],["▶","Start earning","Start a 24-hour mining session",startMining,"Start"]].map(([ic,t,sub,fn,lab])=><div className="ex-card" key={t} style={{padding:15,display:"flex",alignItems:"center",gap:12,marginBottom:10}}><div style={{width:44,height:44,borderRadius:14,background:"#f0efff",display:"grid",placeItems:"center",fontSize:20}}>{ic}</div><div style={{flex:1}}><b style={{fontSize:14}}>{t}</b><div style={{fontSize:10,color:"#8d96a7"}}>{sub}</div></div><button className="ex-btn" onClick={fn} style={{padding:"9px 12px",borderRadius:10,background:"#f0efff",color:"#5d57e9"}}>{lab}</button></div>)}
          <div className="ex-card" style={{padding:16}}><b>Referral milestones</b>{[1,3,5,10].map(n=>{const done=refStats.total>=n;return <div key={n} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderTop:"1px solid #eef0f5",marginTop:7}}><span style={{width:30,height:30,borderRadius:"50%",background:done?"#eafbf4":"#f3f5f8",color:done?"#18a76a":"#8d96a7",display:"grid",placeItems:"center",fontWeight:800,fontSize:11}}>{done?"✓":n}</span><span style={{flex:1,fontSize:12}}>{n} referral{n>1?"s":""}</span><small style={{color:done?"#18a76a":"#8d96a7"}}>{done?"Completed":"Locked"}</small></div>})}</div>
        </div>}

        {tab==="team"&&<div>
          <div style={{marginBottom:15}}><div style={{fontSize:25,fontWeight:800}}>Refer & earn</div><div style={{fontSize:12,color:"#8d96a7"}}>Invite friends and grow together</div></div>
          <div style={{borderRadius:24,padding:20,color:"#fff",background:"linear-gradient(135deg,#26294d,#5d57e9)",marginBottom:11}}><div style={{fontSize:11,opacity:.7}}>Referral earnings</div><div style={{fontSize:31,fontWeight:800,margin:"3px 0 14px"}}>{refStats.nova.toFixed(0)} EARNX</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)"}}><div><b>{refStats.total}</b><small style={{display:"block",opacity:.7}}>Invited</small></div><div><b>{refStats.valid}</b><small style={{display:"block",opacity:.7}}>Valid</small></div><div><b>{qualifiedFriends}</b><small style={{display:"block",opacity:.7}}>Active</small></div></div></div>
          <button className="ex-btn" onClick={handleShareReferral} style={{width:"100%",padding:14,borderRadius:14,background:"#5d57e9",color:"#fff",marginBottom:9}}>↗ Share invite</button><button className="ex-btn" onClick={handleCopyLink} style={{width:"100%",padding:14,borderRadius:14,background:"#fff",border:"1px solid #e5e8ef",color:"#596274",marginBottom:12}}>{copiedLink?"✓ Link copied":"⧉ Copy invite link"}</button>
          {refStats.list?.length>0?<div className="ex-card" style={{padding:16}}><b>Your team</b>{refStats.list.slice(0,8).map((rr,i)=><div key={rr.id||i} style={{display:"flex",alignItems:"center",gap:9,padding:"10px 0",borderTop:"1px solid #eef0f5",marginTop:7}}><div style={{width:37,height:37,borderRadius:"50%",background:"#f0efff",display:"grid",placeItems:"center"}}>{rr.referred?.photo_url?<img src={rr.referred.photo_url} style={{width:37,height:37,borderRadius:"50%"}}/>:"👤"}</div><div style={{flex:1}}><b style={{fontSize:12}}>{rr.referred?.username?"@"+rr.referred.username:rr.referred?.first_name||"Member"}</b><div style={{fontSize:9,color:rr.status==="active"?"#18a76a":"#8d96a7"}}>{rr.status==="active"?"Active":"Pending"}</div></div><small style={{color:"#8d96a7"}}>{rr.active_days_this_month??0}d</small></div>)}</div>:<div className="ex-card" style={{padding:25,textAlign:"center",color:"#8d96a7"}}>👥<div style={{marginTop:5}}>No referrals yet</div></div>}
        </div>}

        {tab==="wallet"&&<div>
          <div style={{marginBottom:15}}><div style={{fontSize:25,fontWeight:800}}>Wallet</div><div style={{fontSize:12,color:"#8d96a7"}}>Manage your EarnX and TON</div></div>
          <div className="ex-card" style={{padding:18,marginBottom:11}}><small style={{color:"#8d96a7"}}>Available TON</small><div style={{fontSize:31,fontWeight:800,margin:"2px 0 14px"}}>{tonBalance.toFixed(5)} TON</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}><button className="ex-btn" onClick={()=>setShowSwap(true)} style={{padding:12,borderRadius:13,background:"#f0efff",color:"#5d57e9"}}>↔ Convert</button><button className="ex-btn" onClick={()=>setShowWithdraw(true)} style={{padding:12,borderRadius:13,background:"#5d57e9",color:"#fff"}}>Withdraw</button></div></div>
          <div className="ex-card" style={{padding:18,marginBottom:11}}><small style={{color:"#8d96a7"}}>EarnX credits</small><div style={{fontSize:28,fontWeight:800}}>{novaDisplay} EARNX</div><div style={{fontSize:11,color:"#8d96a7",marginTop:4}}>Mining power: <b style={{color:"#5d57e9"}}>{miningPower.toLocaleString()}</b></div></div>
          <div className="ex-card" style={{padding:16}}>{buyError&&<div style={{background:"#fff1f1",border:"1px solid #ffd0d0",borderRadius:10,padding:"10px 12px",marginBottom:10,fontSize:11,color:"#c62828"}}>{buyError}</div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><div><b>EarnX Shop</b><div style={{fontSize:10,color:"#8d96a7"}}>Boost your mining rate</div></div><TonConnectButton style={{height:30}}/></div>{displayTiers.slice(0,4).map(item=><div key={item.id} style={{display:"flex",alignItems:"center",gap:9,borderTop:"1px solid #eef0f5",padding:"11px 0"}}><span style={{width:38,height:38,borderRadius:12,background:"#f0efff",display:"grid",placeItems:"center"}}>⚡</span><span style={{flex:1}}><b style={{fontSize:12}}>{item.power} EARNX</b><small style={{display:"block",color:"#8d96a7"}}>{item.daily} TON/day</small></span><button className="ex-btn" onClick={()=>handleBuyTier(item)} style={{padding:"8px 10px",borderRadius:10,background:"#202637",color:"#fff",fontSize:10}}>{item.cost} TON</button></div>)}{displayTiers.length===0&&<div style={{padding:15,textAlign:"center",color:"#8d96a7"}}>Shop is loading…</div>}</div>
        </div>}

        {tab==="profile"&&<div>
          <div style={{textAlign:"center",padding:"6px 0 17px"}}><div style={{width:76,height:76,borderRadius:"50%",margin:"0 auto 9px",background:"linear-gradient(135deg,#5d57e9,#8580ff)",display:"grid",placeItems:"center",color:"#fff",fontSize:29,fontWeight:800}}>{(tgUser?.first_name||"E").charAt(0).toUpperCase()}</div><div style={{fontSize:21,fontWeight:800}}>{tgUser?.first_name||"EarnX member"}</div><div style={{fontSize:11,color:"#8d96a7"}}>{tgUser?.username?"@"+tgUser.username:"Telegram member"}</div></div>
          <div className="ex-card" style={{padding:7,marginBottom:11}}>{[["🛍️","EarnX Shop",()=>setTab("wallet")],["🎁","Daily rewards",()=>setShowStreak(true)],["↗","Invite friends",()=>setTab("team")],["🏆","Leaderboard",()=>alert("Leaderboard is available in EarnX.")]].map(([ic,label,fn])=><button key={label} className="ex-btn" onClick={fn} style={{width:"100%",display:"flex",alignItems:"center",gap:11,padding:13,border:0,borderBottom:"1px solid #eef0f5",background:"#fff",textAlign:"left",color:"#202637"}}><span style={{width:34,height:34,borderRadius:10,background:"#f2f3ff",display:"grid",placeItems:"center"}}>{ic}</span><span style={{flex:1}}>{label}</span><span style={{color:"#a0a7b4"}}>›</span></button>)}</div>
          <div className="ex-card" style={{padding:16}}><b>Account</b><div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #eef0f5",fontSize:11}}><span style={{color:"#8d96a7"}}>Telegram ID</span><span>{tgUser?.id||"—"}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #eef0f5",fontSize:11}}><span style={{color:"#8d96a7"}}>Mining power</span><span>{miningPower.toLocaleString()}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",fontSize:11}}><span style={{color:"#8d96a7"}}>Status</span><span style={{color:"#18a76a",fontWeight:800}}>Active</span></div></div>
        </div>}
      </main>

      <nav className="ex-nav"><div style={{display:"flex",maxWidth:430,margin:"0 auto"}}>{navItems.map(item=>{const icon=item.id==="home"?"⌂":item.id==="tasks"?"☷":item.id==="team"?"👥":item.id==="wallet"?"▣":"●";return <button key={item.id} className={tab===item.id?"active":""} onClick={()=>setTab(item.id)}><span style={{fontSize:21,lineHeight:1}}>{icon}</span><span>{item.label}</span></button>})}</div></nav>

      {showSwap&&<SwapModal onClose={()=>setShowSwap(false)} hashes={hashes} onSwapComplete={(rr)=>{if(rr?.hashes!=null)setHashes(Number(rr.hashes));if(rr?.tonBalance!=null)setTonBalance(Number(rr.tonBalance));}}/>}
      {showWithdraw&&<WithdrawModal onClose={()=>setShowWithdraw(false)} tonBalance={tonBalance} qualifiedFriends={qualifiedFriends} onGoSwap={()=>setShowSwap(true)} onInvite={handleShareReferral} onWithdrawComplete={()=>{setTonBalance(0);setShowWithdraw(false);}} minWithdrawTon={minWithdrawTon}/>}
    </div>
  );
}
