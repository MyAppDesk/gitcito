// Website chrome in tr. Keys mirror en.mjs; anything missing falls back to English.
export const tr = {
  'nav.handbook': 'El kitabı',
  'nav.roadmap': 'Yol haritası',
  'nav.github': 'GitHub',
  'nav.sponsor': 'Destek ol',
  'nav.download': 'İndir',

  'foot.license':
    'MIT lisanslı · <a href="https://myappdesk.dev">MyAppDesk</a> tarafından 💜 ile yapıldı',
  'foot.source': 'Kaynak kod',
  'foot.roadmap': 'Yol haritası',
  'foot.reportIssue': 'Sorun bildir',
  'foot.sponsor': 'Destek ol',

  'meta.title': 'Gitcito — git’in tamamı, onu size gösteren bir arayüzle',
  'meta.description':
    'Baştan sona vibe coding ile yazılmış bir Git istemcisi. Ücretsiz. Commit grafiği, satır satır hazırlama, rebase, çalışma ağaçları, alt modüller, LFS — artı diğer istemcilerin yapmadığı birkaç şey.',

  'hero.title': 'Git’in tamamı,<br /><em>onu size gösteren bir arayüzle</em>',
  'hero.lede':
    'Commit grafiği, satır satır hazırlama, rebase, çalışma ağaçları, alt modüller, LFS.<br />Sıradan şeyler, düzgünce yapılmış — artı başka kimsenin yapmadığı birkaçı.',
  'hero.download': 'Platformunuz için indirin',
  'hero.source': 'Kaynağı görüntüle',
  'hero.terms': 'Ücretsiz · MIT · v{version}',
  'hero.graphAlt': 'Gitcito commit grafiği',

  'features.title': 'Diğer istemcilerin yapmadığı birkaç şey',
  'features.sub':
    'Bunların hiçbiri Gitcito’yu kullanma sebebi değil — sebep yukarıdaki liste. Var olmalarının nedeni, git’in yanıtı zaten biliyor olması ve hiçbir istemcinin sormaya zahmet etmemesi.',

  'ordinary.title': 'Neler var',
  'ordinary.sub':
    'Eksiksiz bir istemci, bir alt küme değil. Hepsi yapılmış, belgelenmiş ve bugün uygulamanın içinde — sıradan şeyler, yani git kullanmanın asıl büyük kısmı.',
  'ordinary.graph': 'Gerçek şeritleri olan, devasa geçmişler için pencerelenmiş commit grafiği',
  'ordinary.staging': 'Tek tek satırlara inen hazırlama',
  'ordinary.conflicts': 'Hangi tarafın hangisi olduğunu söyleyen üç panelli çakışma çözücü',
  'ordinary.rebase': 'Sürükleyerek etkileşimli rebase',
  'ordinary.stacks': 'Kademeli yeniden yığmayla yığılmış dallar',
  'ordinary.recovery': 'Reflog, WIP anlık görüntüleri, rehberli bisect',
  'ordinary.prs': 'GitHub, GitLab, Bitbucket ve Azure DevOps üzerinde pull request’ler',
  'ordinary.terminal': 'Tümleşik terminal — gerçek bir PTY',
  'ordinary.launch': '<code>.vscode/launch.json</code> dosyasından doğrudan çalıştırma ve hata ayıklama',
  'ordinary.ai': 'Okuduğu satırları kaynak gösteren isteğe bağlı yapay zekâ',
  'ordinary.themes': 'Yerleşik temalar, açık ve koyu, artı yapay zekâ ile üretilenler',
  'ordinary.languages': 'Baştan sona çevrilmiş, el kitabı dahil — Arapça ve İbranice yerleşimi aynalar',
  'ordinary.conflictAlt': 'Çakışma çözücü',

  'download.title': 'İndir',
  'download.sub': 'Son sürüm: <strong>v{version}</strong>. Her yapı CI üzerinden yayımlanır.',
  'download.cli':
    'Ya da bir depoyu terminalinizden <code>gitcito .</code> ile açın — bkz. <a href="{cli}">komut satırı</a>.',
  'download.macNote': 'Apple silicon &amp; Intel · imzalı ve noterlenmiş',
  'download.winNote': 'Kurulum dosyası (x64)',
  'download.linuxNote': 'AppImage · deb',
  'download.forOs': '{os} için indir',

  'handbook.title': 'Uygulamaya gömülü, {pages} sayfalık bir el kitabı',
  'handbook.sub': 'Her özellik açıklanmış — uygulamada çevrimdışı ve tam burada.',

  'sponsor.title': 'Gitcito’ya destek olun',
  'sponsor.body':
    'Ücretsiz, MIT, arka uç yok, telemetri yok, üste satılacak bir şey yok — yani satın alınacak bir şey de yok. Sponsorluk, imzalı macOS yapılarının ihtiyaç duyduğu Apple Developer sertifikasını, el kitabını ve çevirileri karşılıyor. Hata bildirimleri de tam olarak o kadar değerli.',
  'sponsor.cta': 'GitHub üzerinden destek olun',

  'doc.titleSuffix': 'Gitcito el kitabı',
  'doc.filter': 'Sayfaları süz…',
  'doc.filterLabel': 'Sayfaları süz',
  'doc.edit': 'Bu sayfayı GitHub üzerinde düzenle',
  'doc.improve': 'Bu çeviriyi GitHub üzerinde iyileştir',

  'feature.conflict-radar.title': 'Çakışma radarı',
  'feature.conflict-radar.body':
    'Hangi dalların çakışacağını, hiçbirini birleştirmeden <strong>önce</strong> görün. Birleştirmeler nesne veritabanının içinde olur — checkout yok, çalışma dizini değişikliği yok, sonradan temizlenecek hiçbir şey yok.',
  'feature.semantic-diff.title': 'Anlamsal diff',
  'feature.semantic-diff.body':
    '400 satırlık kırmızı/yeşil bir duvar yerine <code>startServer</code> → <code>bootServer</code>. Gerçek tree-sitter ayrıştırması, regex değil.',
  'feature.range-diff.title': 'O günden beri ne değişti',
  'feature.range-diff.body':
    'Gözden geçirdiğiniz dala force-push yaptılar. Hangi commit’lerin yeniden yazıldığını, düşürüldüğünü ya da eklendiğini görün — eski konumlar reflog sayesinde bedavaya gelir.',
  'feature.repo-chat.title': 'Depo sohbeti',
  'feature.repo-chat.body':
    'Bu depoya soru sorun; yanıt, okuduğu satırları kaynak gösterir. Bakması gereken dosya ve commit’leri sabitleyin — grafikten, dosya ağacından ya da diskteki herhangi bir yerden sürükleyin.',
  'feature.absorb.title': 'Absorb',
  'feature.absorb.body':
    'Gözden geçirme düzeltmelerinizi hazırlayın; blame her hunk’ı onu getiren commit’e bir <code>fixup!</code> olarak yönlendirsin.',
  'feature.time-machine.title': 'Zaman makinesi',
  'feature.time-machine.body':
    'Bir kaydırıcıyı sürükleyin ve deponun değişişini izleyin: dosyalar belirir, yer değiştirir, geri gelir. HEAD hiç kımıldamaz ve commit’lenmemiş çalışmanıza dokunulmaz.',
  'feature.timelapse.title': 'Timelapse',
  'feature.timelapse.body':
    'Deponun bütün yaşamını bir animasyon olarak oynatın — ve video olarak dışa aktarın; kayıt sayfanın içinde yapılır, kurulacak bir kodlayıcı yoktur.',
  'feature.pr-preview.title': 'Bir pull request’i önizleme',
  'feature.pr-preview.body':
    'Başkasının pull request’ini — fork’tan gelenler dahil — hiçbir şey commit’lemeden çalıştırın. API token’ı yok, ikinci bir remote yok: head, sunucunun zaten yayımladığı ref’ten çekilir; GitHub, GitLab, Bitbucket, Azure DevOps ya da Gitea üzerinde.',
  'feature.mission-control.title': 'Komuta merkezi',
  'feature.mission-control.body':
    'Çalışma alanındaki her depo tek ekranda, size ihtiyacı olana göre sıralanmış: önce engellenmiş, sonra eşitlenecek, sonra kirli, sonra sessiz.',
  'feature.attributes.title': 'Dosya öznitelikleri, arayüzüyle',
  'feature.attributes.body':
    'Git’te kimsenin yazmadığı en yararlı dosya. Satır sonları herkes için bir kez halledilmiş, artık çakışmayan bir changelog, sürüm arşivlerinin dışında tutulan fixture’lar — ve dönüştürücü kuruluysa Word ile PDF için okunabilir diff’ler.',
  'feature.languages.title': 'Sizin diliniz, muhtemelen',
  'feature.languages.body':
    'Düğmelerin yarım yamalak bir çevirisi değil — açıklamalar dahil bütün arayüz. Arapça ve İbranice yerleşimi aynalar; grafik, diff’ler, yollar ve terminal ise soldan sağa kalır, çünkü kod o yönde okunur.',
  'feature.security.title': 'Sırlarınız sizde kalır',
  'feature.security.body':
    'Arka uç yok. Token’lar ve kasa girdileri işletim sisteminizin anahtar zinciriyle şifrelenir — ve ne için olduğu size söylenip siz evet demeden o anahtar zincirine hiçbir şey dokunmaz.'
}
