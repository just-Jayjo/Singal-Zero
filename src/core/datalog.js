import * as THREE from 'three'

const DATALOG_TEXT = {
  'log_01': '設施通訊中斷記錄。值班工程師切換備用迴路時系統回應「權限不足」。斷訊前內部封包來自零層，內容：SOS。入口閘門已自動鎖定。',

  'log_02': '核心資料庫在無人操作下將一組未知座標反覆寫入所有備份磁區。座標指向地下 800 公尺——該處不存於任何建築藍圖。寫入頻率持續上升，像是在回應什麼。',

  'log_03': '三號泵浦偵測到 0.3Hz 異常震動。設施內無任何設備運轉於此頻率。震動源頭來自地下深處——與伺服器機房記錄的座標一致。組長已失蹤。',

  'log_04': '封鎖區 D 防禦系統進入交戰模式，封鎖命令發布者為六週前已失蹤的林博士。監視器拍到她未穿防護裝備進入零層閘門，心跳在九秒後瞬間中斷。',

  'log_05': '訊號具有語法結構。它在針對我們調整通訊協定。第七次回傳的內容是中文：「你們的恐懼很新鮮。」這座設施不是為了研究能源——它是為了跟那個東西對話。',

  'log_06': '四樓天花板管線滲出有機液體，與人類組織相似度 91.2%。液體從管線內部「長」出來。培養皿在四小時內長滿菌落，排列出圖案。實驗室已從內部鎖死。',

  'log_07': '零層核心密封艙內部偵測到生物特徵訊號。心率：每分鐘十二下。七百八十一小時。不進食不移動。訊號波形近期發生變化——它在學我們，但學錯了。'
}

const FULL_DATALOG_TEXT = {
  'log_01': `設施通訊中斷紀錄 — 中控室最後廣播：
「冷卻系統壓力異常上升。三號泵浦已自動停機，備用迴路無法啟動——有人手動關閉了閥門。」
值班工程師試圖切換至遠端控制，系統回應「權限不足」。通訊工程組在斷訊前七分鐘截獲一段內部封包，來源為零層，內容僅有三個字元：SOS。
此後全頻道靜默。
入口閘門在斷訊後四小時自動鎖定，所有進出權限被最高級別協定覆蓋。我們被困在這裡了。`,

  'log_02': `資料庫異常寫入紀錄 — 系統自動備份時間戳：03:47:22
核心資料庫在無任何人員操作的情況下，開始將一組未知座標反覆寫入所有備份磁區。座標解析結果為垂直向下 800 公尺——該深度不存在於任何建築藍圖中。
資訊組嘗試追溯寫入來源，發現指令來自內部排程器。但該排程器應當在五年前就已停用。
更令人不安的是：該座標的精確度達到了毫米級別。地下八百公尺處有什麼東西被精確標記了。不是自然地質結構——是某種人造物的尺寸。
最後一次讀取記錄顯示，寫入頻率在十二小時內從每分鐘一次增加到每秒鐘四十七次。像是在回應什麼。`,

  'log_03': `三號泵浦異常震動分析報告 — 工程部歸檔編號：E-227B
震動頻率 0.3Hz，波形近乎完美的正弦曲線。機械工程師花了六小時確認一件事：設施內沒有任何設備的運轉頻率是 0.3Hz。沒有任何。
該頻率的振幅在過去三天內成長了 340%，但泵浦的轉速完全沒有變化——這表示震動來源不在泵浦本身，而是從外部傳導至泵浦外殼。
管線工程組沿著管線往回追蹤，發現震動的源頭指向——我再確認一次——指向地下深處。與伺服器機房記錄的那組座標方位一致。
組長在當天下午提交了辭呈。行政系統顯示「已核准」。但組長已經失蹤了三十個小時。`,

  'log_04': `安全系統自動紀錄 — 封鎖區 D 全區封鎖通知
所有防禦系統已切換至交戰模式。無人機巡邏路線重新規劃為「清除路線」——這個術語不存在於任何已知的操作手冊中。
系統記錄顯示，封鎖命令的發布帳號屬於林博士，但她已在六週前被列為「失蹤人員」。她的門禁卡最後一次使用記錄在零層閘門。
監視器畫面顯示她的身影走進閘門時，姿態正常，步伐穩定。但她走進去的方向——是通往核心的通道。那段通道理應是真空密封、任何人都不可能不穿防護裝備通過的。
畫面中她沒有穿防護裝備。
閘門在她身後關閉後，再也沒有開啟過。心跳偵測器在進入後九秒停止訊號。不是衰減——是瞬間中斷。`,

  'log_05': `研究員 陳 最後個人記錄 — 語音轉文字，時間戳不明
我反覆分析了訊號源的頻譜結構。它不是雜訊。它具有語法結構——不是人類語言，而是某種更古老的編碼方式。
最讓我害怕的是：它在針對我們調整。我們更換通訊協定，它就跟著切換。我們加密，它就破解。七次。
第七次的時候，它沒有破解。它回傳了一段訊息。不是二進位，不是編碼——是中文。
內容是：「你們的恐懼很新鮮。」
我不知道它是怎麼學會的。這套系統從未連接過外部網路。它唯一的輸入來源是零層核心下方那根深入岩盤的探測鑽桿。它碰到了什麼——那個東西在跟我們說話。
我們不該繼續往深處鑽的。這座設施從一開始就不是為了研究能源——它是為了跟那個東西對話而建的。而我現在才看懂文件封面的真正標題。
「雙向接觸協議。」
我今天晚上會把核心備份帶到四樓焚化爐。他們不會讓我銷毀的。但他們攔不住我。`,

  'log_06': `第四層環境異常報告 — 有機物汙染檢測
天花板管線接縫處滲出不明液體，採集樣本送檢後結果如下：有機碳化合物濃度 47.3%，蛋白質片段結構，與人類組織相似度 91.2%。
問題在於：第四層上方除了岩層之外什麼都沒有。沒有任何管線應該經過這裡——四樓是最後一層，再往上是實心岩盤。
液體不是從上方滲下來的。它是從管線內部「長」出來的。
微生物培養皿在接種樣本後四小時內長滿了菌落。正常程序需要七十二小時。培養箱的溫度記錄顯示，在這四小時中，樣本內部溫度曾短暫上升至攝氏三十九度——培養箱設定溫度是攝氏四度。
培養皿內的菌落排列出了某種圖案。生物組的人拍了照片之後就沒有再出來過。實驗室現在從內部鎖死了。燈還亮著。但沒有人回應通訊。`,

  'log_07': `零層保全系統最終存檔 — 生物特徵異常報告
時間戳：系統時間 781 小時 34 分鐘（已偏離標準時區，不建議作為參考）
偵測到未註冊生物特徵訊號。
來源位置：核心密封艙內部。
核心密封艙的最後一次開啟記錄在七百八十一個小時之前。開啟原因是安裝探測鑽桿。完成安裝後，艙門即由四位在場人員共同見證封閉，並以鋼纜焊接加固。
密封艙內部不應有任何生物。
訊號強度在過去三十天內持續上升。早期訊號微弱到被系統歸類為儀器誤差。但現在——波形分析顯示該訊號與人類心電圖高度吻合。
但心率是每分鐘十二下。
沒有生物能在心率十二的情況下存活。但它一直在那裡面。七百八十一個小時。不進食。不喝水。不移動。
系統日誌顯示，在九分鐘前，該訊號的波形發生了第一次變化——從穩定的竇性節律轉變為某種非週期性的波動。分析模組給出的推論是：
它在模仿我們。
但它學錯了。`
}

const LOG_NAMES = {
  'log_01': '最後通訊紀錄', 'log_02': '地底座標備份',
  'log_03': '泵浦異常分析', 'log_04': '封鎖區D紀錄',
  'log_05': '陳研究員遺言', 'log_06': '四樓汙染報告',
  'log_07': '核心最終存檔'
}

export function createDataLogPickup(scene, position, logId, onCollect) {
  if (!DATALOG_TEXT[logId]) return null

  const group = new THREE.Group()
  group.position.copy(position)
  group.position.y = 1.0

  const S = 1.0

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x00f2ff, emissive: 0x00f2ff,
    emissiveIntensity: 1.2, transparent: true, opacity: 0.9
  })
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0a1420, roughness: 0.3, metalness: 0.8
  })
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x00f2ff, emissive: 0x0088ff,
    emissiveIntensity: 0.6, transparent: true, opacity: 0.35,
    side: THREE.DoubleSide
  })
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0x00f2ff, emissive: 0x0066ff,
    emissiveIntensity: 0.25, transparent: true, opacity: 0.12
  })
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0x00f2ff, emissive: 0x00aaff,
    emissiveIntensity: 0.4, transparent: true, opacity: 0.15
  })

  /* 浮游資料核心 — 八面體 */
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18 * S, 0), coreMat)
  core.position.y = 0
  group.add(core)

  /* 內層暗色底框 */
  const base = new THREE.Mesh(new THREE.OctahedronGeometry(0.22 * S, 0), darkMat)
  base.position.y = 0
  group.add(base)

  /* 外環 — 傾斜旋轉環 */
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35 * S, 0.02, 8, 24), ringMat)
    ring.position.y = 0
    ring.rotation.x = Math.PI / 3 + i * Math.PI
    ring.rotation.z = i * Math.PI / 2
    ring.userData.ringPhase = i
    group.add(ring)
  }

  /* 垂直光束 — 上下延伸 */
  const beamUp = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.06, 1.8 * S, 6, 1, true), beamMat)
  beamUp.position.y = 0.9 * S
  group.add(beamUp)
  const beamDown = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.005, 1.8 * S, 6, 1, true), beamMat)
  beamDown.position.y = -0.9 * S
  group.add(beamDown)

  /* 底部光暈 */
  const glowDisc = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.5, 16), glowMat)
  glowDisc.position.y = -0.02
  glowDisc.rotation.x = -Math.PI / 2
  group.add(glowDisc)

  /* 環繞粒子（小型發光點）*/
  const particleMat = new THREE.PointsMaterial({
    color: 0x00f2ff, size: 0.04,
    transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false
  })
  const pCount = 8
  const pPos = new Float32Array(pCount * 3)
  for (let i = 0; i < pCount; i++) {
    const angle = (i / pCount) * Math.PI * 2
    pPos[i * 3] = Math.cos(angle) * 0.55 * S
    pPos[i * 3 + 1] = 0
    pPos[i * 3 + 2] = Math.sin(angle) * 0.55 * S
  }
  const pGeo = new THREE.BufferGeometry()
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
  const particles = new THREE.Points(pGeo, particleMat)
  particles.position.y = 0
  group.add(particles)

  scene.add(group)

  let collected = false
  const bbox = new THREE.Box3(
    new THREE.Vector3(position.x - 0.6, position.y, position.z - 0.6),
    new THREE.Vector3(position.x + 0.6, position.y + 1.8, position.z + 0.6)
  )

  return {
    mesh: group,
    bbox,
    update(delta, playerPos) {
      if (collected) return
      const t = Date.now() * 0.001
      group.rotation.y += delta * 1.2
      core.rotation.x = Math.sin(t * 0.5) * 0.3
      core.rotation.z = Math.cos(t * 0.7) * 0.2
      const beamPulse = 0.85 + Math.sin(t * 2.0) * 0.15
      coreMat.emissiveIntensity = 0.8 + Math.sin(t * 3.0) * 0.4
      group.position.y = 1.0 + Math.sin(t * 1.5) * 0.15
      for (const child of group.children) {
        if (child.isMesh && child.geometry.type === 'TorusGeometry') {
          child.rotation.z += delta * (0.5 + child.userData.ringPhase * 0.3)
        }
      }
      particles.rotation.y += delta * 1.8
      beamMat.opacity = 0.08 + Math.sin(t * 1.2) * 0.04
    },
    collect() {
      if (collected) return false
      collected = true
      group.traverse(child => {
        if (child.isMesh) {
          child.geometry?.dispose()
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose())
          else child.material?.dispose()
        }
      })
      scene.remove(group)
      if (onCollect) onCollect(logId, DATALOG_TEXT[logId], LOG_NAMES[logId])
      return true
    },
    isCollected() { return collected }
  }
}

export function getDatalogText(logId) { return DATALOG_TEXT[logId] || '' }
export function getFullDatalogText(logId) { return FULL_DATALOG_TEXT[logId] || '' }
export function getDatalogName(logId) { return LOG_NAMES[logId] || logId }
export function getAllDatalogIds() { return Object.keys(DATALOG_TEXT) }
export function getFullDatalogIds() { return Object.keys(FULL_DATALOG_TEXT) }
