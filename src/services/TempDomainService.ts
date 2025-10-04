import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';

export interface TempDomainConfig {
  /** Local file path to store domains */
  localStoragePath?: string;
  /** Enable automatic updates from external sources */
  autoUpdate?: boolean;
  /** Update interval in hours */
  updateIntervalHours?: number;
  /** External sources for domain lists */
  externalSources?: string[];
  /** Custom domains to always include */
  customDomains?: string[];
}

export class TempDomainService {
  private config: Required<TempDomainConfig>;
  private domains: Set<string> = new Set();
  private lastUpdate: Date | null = null;
  private updateTimer: NodeJS.Timeout | null = null;

  // Built-in domain list as fallback
  private readonly builtInDomains = [
    'maildim.com', 'moakt.com', 'mailsac.com', 'minimail.eu.org', 'mintemail.com', 'mail-temp.com',
    'remaild.com', 'simoaudio.live', 'ferrer-lozano.es', 'fbclone.com', 'hieu.in', 'naylonksosmed.com',
    '24hinbox.com', 'likemaxcare.com', 'bankinnepal.com', 'kerkenezali.space', 'hotrokh.com',
    'code-gmail.com', 'topnnov.ru', 'adb3s.com', 'smartretireway.com', 'mutudev.com', 'airmail.top',
    'anhhungrom47.xyz', 'btcmod.com', 'alightmotion.id', 'hitbase.net', 'ds4kojima.com', 'newssolor.com',
    'peakfixkey.com', 'nhungdang.xyz', 'towintztf.top', 'cumfoto.com', 'xdigit.top', 'dmxs8.com',
    'chatwesi.com', 'mobilevents.es', 'buybm.one', 'honesthirianinda.net', 'premiapp.com',
    'reaktifmuslim.network', 'strongnutricion.es', 'alikmotion.com', 'linkjetdata.com', 'auraness.com',
    'primerisegrid.com', 'pdood.com', 'nanopools.info', 'aikoreaedu.com', 'businesscell.network',
    'dqmail.org', '1820mail.vip', 'furkanozturk.cfd', 'dichvuxe24h.com', 'razeny.com', 'gmailot.com',
    'boranora.com', 'chantellegribbon.com', 'bytedigi.com', 'brieffirst.com', 'tmxttvmail.com',
    'karenvest.com', 'igdinhcao.click', 'rsmspca.com', 'gmaillk.com', 'rentproxy.xyz', 'hotsmial.click',
    'chiamn.com', 'caychayyy.shop', 'past-line.com', 'viavuive.net', 'atticus-finch.es', 'ecoverseworld.com',
    'easyhomefit.com', 'mindoraspace.com', 'riff-store.com', 'daemonixgames.com', 'zsdigital.tech',
    'zhiezpremium.store', 'berryslimming.com', 'bukanimers.com', 'bosakun.com', 'sanalcell.network',
    'flyriseweb.com', 'pakservices.info', 'auhit.com', 'k4money.com', 'fsercure.com', 'marattok.com',
    'elisestyle.shop', 'patity.com', 'cosoinan.com', 'nanatha.academy', 'capcutku.io', 'storepro.site',
    'doremifasoleando.es', 'capzone.io', 'doanhnhanfacebook.com', 'harmfulsarianti.co', 'patance.com',
    'lidercontabilidadebrasil.com', 'cayxupro5.com', 'retroholics.es', 'chongqilai.cc', 'bobbytc.cc',
    'bytonf.com', 'capcuter.com', 'nowpodbid.com', 'danielmunoz.es', 'ayahseviana.io', 'tastmemail.com',
    'asteraavia.ru', 'scatterteam.com', 'secretreview.net', 'jobstreet.cam', 'maxseeding.vn', 'muagicungre.com',
    'datquynhon.net', 'edgepodlab.com', 'quyinvis.net', 'smartgrasspools.tech', 'laksamantunggalakma.me',
    'gmail2.shop', 'fdfriend.store', 'hieuclone.net', 'nguyenvuquocanh.com', 'parcival-store.net',
    'muataikhoan.info', 'akunku.shop', 'physicaladithama.io', 'dothivinhomescangio.vn', 'omggreatfoods.com',
    'digitalproductprovider.com', 'coffeepancakewafflebacon.com', 'likevip.net', 'chinaqoe.com',
    'happiseektest.com', 'genztrang.com', 'yotomail.com', 'supporttc.com', 'lellolidk.de', 'azulejoslowcost.es',
    'mail12h.com', 'gemapan.com', 'googl.win', 'besnetor.com', 'betteryoutime.com', 'forumfreeai.com',
    'i-love-you-3000.net', 'peakwavepro.com', 'oposite.org', 'automizly.net', 'capcutku.com', 'vuatrochoi.online',
    'basefixzone.com', 'coochi.nl', 'trywavegrid.com', 'mailfance.com', 'tritunggalmail.com', 'ngontol.com',
    'killlove.site', 'jibbangod.biz', 'incompetentgracia.net', 'nadajoa.com', 'roseau.me',
    'contabilidadebrasil.org', 'kazinkana.com', 'puzzlepro.es', 'naverly.com', 'peakfizz.com', 'vitinhlonghai.com',
    'selaciptama.com', 'dontsleep404.com', 'biscuitvn15.xyz', 'chaoji.icu', 'caosusaoviet.vn', 'naverapp.com',
    'starnlink.com', 'zarabar.com', 'susumart.com', 'basebuykey.com', 'mitrabisa.com', 'docbao7.com',
    'locmediaxl.com', 'banmailco.site', 'erkjhgbtert.online', 'halamanenuy.net', 'jonsjav.cc', 'autospozarica.com',
    'bestbot.pro', 'premiumvns.com', 'findids.net', '88cloud.cc', 'reditd.asia', 'jitteryfajarwati.co',
    '25sas.help', 'situsbebas.com', 'ebarg.net', 'nhotv.com', 'k-global.dev', 'zoomintens.com', 'gmail2.gq',
    'clonevnmail.com', 'jagomail.com', 'zenbada.com', 'boostme.es', 'pendapatmini.net', 'joytoc.com',
    'konterkulo.com', 'piqamail.top', 'visionarysylvia.biz', 'elmos.es', 'livegolftv.com', 'trantienclone.top',
    '5conto.com', 'cggup.com', 'shopvia2fa.net', 'mailphu.com', 'doods7.com', 'mailx.click', 'mewnwh.cc',
    'vregion.ru', 'thulinh.net', 'kelangthang.com', 'tamsholdings.com', 'taptoplab.com', 'easygbd.com',
    'chupanhcuoidep.vn', 'siminfoscent.cfd', 'thef95zone.com', 'ship79.com', 'hutmails.com', 'javamusic.id',
    'p-y.cc', 'vibertees.com', 'orbitjolly.com', 'tms.sale', 'private-year.com', 'basepathgrid.com',
    'portaltrendsarena.com', 'jualakun.com', 'rajaiblis.com', 'vienphunxamvidy.com', 'excipientnetwork.com',
    'nguyenlieu24h.com', 'monijoa.com', 'email-temp.com', 'goldinbox.net', 'tramynguyen.net', 'pickuplanet.com',
    '1trionclub.com', 'autoxugiare.com', 'zoomku.pro', 'extraku.net', 'nelcoapps.com', 'ppaa.help', 'peakance.com',
    'brenlova.com', 'receita-iof.org', 'thaitudang.xyz', 'irpine.com', '681mail.com', 'tiktokngon.com',
    'stubbornakdani.io', 'cederajenab.biz', 'lovelynazar.net', 'xinnian.sbs', 'replicant.club', 'book4money.com',
    'nowfixweb.com', 'thuexedulichhanoi.com', 'wintersarea.xyz', 'quockhanh8686.top', '816qs.com', 'cloneiostrau.org',
    'codemail1.com', 'guaierzi.icu', 'dvseeding.vn', 'otpku.com', 'igdinhcao.com', 'bjs-team.com', 'kiluch.com',
    'clonemailgiare.com', 'fastmails.info', 'king.buzz', 'reacc.me', 'xapimail.top', 'h0tmaii.com', 'care-breath.com',
    'emailkp.com', 'nowhex.com', 'linkbm365.com', 'khoigame.com', 'gocampready.com', 'luonglanhlung.com',
    'seohesapmarket.com', 'aiqoe.com', 'onasabiz.com', 'wotomail.com', 'datphuyen.net', 'gfacc.net', 'wochaojibang.sbs',
    'beautyshine.club', 'katanajp.online', 'etchingdoangia.com', 'fbviamail.com', 'pizzamagic.com', 'kk1.lol',
    'youngbloodproductions.site', 'pertinenthersavira.net', 'kierastyle.shop', 'meta-support-12sk6xj81.com',
    'yourfreegalleries.net', 'xxx-tower.net', 'iskiie.com', 'eewmaop.com', 'quanpzo.click', 'mariascloset.org',
    'dogonoithatlienha.com', 'muratreis.icu', 'nichaoxing.cc', 'bilcnk.online', 'shareithub.com', 'clonetrust.com',
    'tlwmail.xyz', 'energen.live', 'chahcyrans.com', '4xoay.com', 'xcvzfjrsnsnasd.sbs', 'mabubsa.com', 'vps79.com',
    'banhang14.com', 'hubglee.com', 'itm311.com', 'foodkachi.com', 'rapatbahjatya.net', 'picsviral.net',
    'gulasurakhman.net', 'sparkletoc.com', 'varslily.com', 'juliachic.shop', 'lechatiao.com', '996a.lol', 'puretoc.com',
    'cuongaquarium.com', 'housereformas.es', 'raraa.store', 'xuchuyen.com', 'hopeence.com', 'auraity.com', 'shiita12.com',
    'putameda.com', 'edgetopgrid.com', 'iristrend.shop', 'narcoboy.sbs', 'khoke.nl', 'tangeriin.com', 'bb99.lol',
    'fitmindgate.com', 'tandlplith.se', 'karbonaielite.com', 'thichkiemtien.com', 'danangsale.net', 'trantienclone.fun',
    'tryhivekey.com', 'f2pools.info', 'akbip.com', 'successfulnewspedia.com', 'byzoometri.com', 'melyshop.es',
    'xeana.co', 'automisly.org', 'nethubmail.net', 'drewhousethe.com', 'khuong.store', 'eise.es', 'baseflowpro.com',
    'linkfieldrun.com', 'timkiems.com', 'kabarr.com', 'anhvip9999.com', 'cabangnursalina.net', 'onaxgames.com',
    'sddsfds.help', 'lilywear.shop', 'tipuni.com', 'mudahmaxwin.com', 'forummaxai.com', 'auraence.com', 'ntspace.shop',
    '24mail.top', 'thodianamdu.com', 'hieuclone.com', 'gimail.cloud', 'subrevn.net', 'basemindway.com', 'moreablle.com',
    'kaisercafe.es', 'edusch.id', 'louxor.shop', 'shiptudo.com', 'hulaspalmcourt.com', 'sonophon.ru', 'fuadd.me',
    'foxnew.info', 'savemydinar.com', 'zndsmail.com', 'viralmedianew.me', 'latihanindrawati.net', 'fintechistanbul.net',
    'w-k.lol', 'prince.id', 'profilepictureguard.club', 'healthsoulger.com', 'himkinet.ru', 'h0tmal.com', 'c-newstv.ru',
    'mantapua.online', 'baobaosport.com', '47bmt.com', '77mail.xyz', 'chaocosen.com', 'mailcok.com', 'bookwormsboutiques.com',
    'lucktoc.com', 'sozenit.com', 'johanssondeterry.es', 'xusieure.com', 'finovatechnow.com', 'goldenmagpies.com',
    'ghvv.click', 'annavogue.shop', 'techhubup.com', 'shahidrazi.online', 'kenvanharen.com', 'netmon.ir', 'theking.id',
    'gmailo.net', 'ghv.pics', 'via17.com', 'reviewfood.vn', 'tappathrun.com', 'phucmmo.com', 'yaholo.cloud', 'fclone.net',
    'thichmmo.com', 'filespure.com', 'laptopnamdinh.com', 'newgoldkey.com', 'mlgmail.top', 'jarringsafri.biz', 'pow-pows.com',
    'lordpopi.com', 'autoxugiare.net', 'tmailnesia.com', 'yogurtdolapta.top', 'casinolotte.com', 'quinz.me',
    'speeddataanalytics.com', 'offensivealiwardhana.net', 'logicampus.live', 'treterter.shop', 'redproxies.com',
    'binanceglobalpoolspro.cloud', 'agallagher.id', 'gmaii.click', 'effortlessinneke.io', 'rincianjuliadi.net',
    'mulyan.top', 'muvilo.net', 'jugramh.com', 'ttmail.vip', 'ourl.me', 'hahaha.vn', 'omarnasrrr.com', 'generator1email.com',
    'cloneads.top', 'liquidacionporsuicidio.es', 'shoha.cc', 'gmaiil.top', 'linkfixweb.com', 'warunkpedia.com',
    'kamazacl.cfd', 'plussparkzen.com', 'hatanet.network', 'jibbo01.com', 'niceminute.com', 'accountscenter.support',
    'kulapozca.cfd', 'deviouswiraswati.biz', 'worldproai.com', 'tikarmeiriana.biz', 'orkaled.es', 'proxy4gs.com',
    'supplementwiki.org', 'gridnewai.com', 'phucmmo.com', 'navermx.com', 'movieisme.co', 'bqsaptri.ovh', 'insidiousahmadi.biz',
    'casaderta.com', 'goliszek.net', 'donusumekatil.com', 'humanzty.com', 'wsj.homes', 'adsensekorea.com', 'antamdesign.site',
    'bypyn.es', 'nguyentinhblog.com', 'ayazmarket.network', 'whatthefish.info', 'penampilannieken.io', 'risantekno.com',
    'baconpro.network', 'fviamail.com', 'itovn.net', 'retroflavor.info', 'eliotkids.com', 'diadiemmuasambienhoa.com',
    'glowible.com', 'mos-kwa.ru', 'linkbitsmart.com', 'getcode1.com', 'statsbyte.com', 'shopcobe.com', 'gollums.blog',
    'mailgg.org', 'sirkelvip.com', 'tuku26012023.xyz', 'xuongdam.com', 'vietfashop.com', 'ahrixthinh.net', 'mailpro.icu',
    'observantmarcelina.net', 'corefitrun.com', 'newbreedapps.com', 'clonechatluong.net', 'sugarloafstudios.net',
    'warunkpedia.com', 'gamersdady.com', 'soul-association.com', 'nolopiok.baby', 'questhivehub.com', 'briefbest.com',
    'rackabzar.com', 'muahetbienhoa.com', 'onemailserv.xyz', 'hearkn.com', 'boxmailvn.com', 'mentongwang.com',
    'bizisstance.com', 'millimnava.info', 'selecsa.es', 'hqt.one', 'justep.news', 'thoitrangquyco.vn', 'trizz.xyz',
    'muaviagiare.com', 'primejetnet.com', 'kimberlyindustry.shop', 'integrately.net', 'automizelymail.info',
    'miscalhero.com', 'xezo.live', 'plussparknet.com', 'katanajp.shop', 'lushily.top', 'duosakhiy.com', 'gdqoe.net',
    'skyfieldhub.com', 'memosly.sbs', 'sunnyblogexpress.com', 'discolive.site', 'nguyendanhkietisocial.com',
    'maxseeding.com', 'edirectai.com', 'trumclone.net', 'getcashstash.com', 'luckence.com', 'multifitai.com',
    'kantclass.com', 'setxko.com', 'tignovate.com', 'highstudios.net', 'primails.me', 'serbaada.me', 'gethexbox.com',
    'available-home.com', 'corejetgrid.com', 'nst-customer.com', 'bienhoamarketing.com', 'unfortunatesanny.net',
    'smanik2.xyz', 'infobuzzsite.com', 'posiedon.site', 'insightsite.com', 'via902.com', 'rangkutimail.me', 'omg-greatfood.com',
    'teknolcom.com', 'mybrainsme.fun', 'mytempmail.org', 'zohoseek.com', 'email-very.com', 'asistx.net', 'plusfieldzone.com',
    'phimteen.net', 'naiveyuliandari.biz', 'youanmi.cc', 'vamflowers.com', 'cbghot.com', 'ckiaspal.ovh', '11jac.com',
    'htmail.store', 'iapermisul.ro', 'trumclone.click', 'ceria.cloud', 'spwmrk.xyz', 'clonemailsieure.com',
    'worldwide-hungerrelief.org', 'siteinfox.com', 'ducclone.com', 'austingambles.org', 'foodieinfluence.pro',
    'dishow.net', 'esimpleai.com', 'jieluv.com', 'ligolfcourse.online', 'mmo55.com', 'kavaint.net', 'cloudmails.tech',
    'cloneigngon.click', 'motionisme.io', 'phanmembanhang24h.com', 'refinedsatryadi.net', 'heavenlyyunida.biz',
    'tanglike94.win', 'shopmmovn.com', 'codt.site', 'availablewibowo.biz', 'otpmail.top', 'scholarshipcn.com',
    'egepalat.cfd', 'inijamet.fun', 'torrentclub.space', 'textsave.net', 'mailvn.top', 'sflike.org', 'vastorestaurante.net',
    'joyhivepro.com', 'locmedia.asia', 'calmgatot.net', 'fennel.team', 'tgbkun.site', 'afandi.baby', 'aijuice.net',
    'automizely.info', 'markanpla.cfd', 'porry.store', 'cfazal.cfd', 'mailyuk.com', 'zenbyul.com', 'thaiphone.online',
    'ses4services.net', 'kailmacas.cfd', 'benedict90.org', 'solkill.store', 'mekerlcs.cfd', 'podhub.email', 'xuncoco.es',
    'stripehitter.site', 'udinnews.com', 'temperatebellinda.biz', 'pastipass.com', 'mailgetget.asia', 'meldedigital.com',
    'dukunmodern.id', 'gunayseydaoglu.cfd', 'hotrometa.com', 'imaanpharmacy.com', 'loyalhost.org', 'remailt.net',
    'napmails.com', 'haanhwedding.com', 'modujoa.com', 'mailcuk.com', 'corebitrun.com', 'gassscloud.net', 'ixsus.website',
    'khuonghung.com', 'trumclone.com', 'hollyvogue.shop', 'nhanquafreefire.net', 'vinaclicks.com', 'bossmanjack.store',
    'breaksmedia.com', 'williamcxnjer.sbs', 'khada.vn', 'geekpc-international.com', 'izhowto.com', 'nofxmail.com',
    'dipan.xyz', 'tinyios.com', 'silangmata.com', 'dedesignessentials.com', 'comprar-com-desconto.com', 'akhirluvia.biz',
    'closedbyme.com', 'minhquan86.top', 'criteriourbano.es', 'vlrregulatory.com', 'matjoa.com', 'dsantoro.es',
    'logichexbox.com', '8844shop.com', 'sieuthiclone.com', 'fitmapgate.com', 'clonekhoe.com', 'demowebsite02.click',
    'vedastyle.shop', 'loridu.com', 'pusatinfokita.com', 'polatfafsca.shop', 'viciouskhalfia.io', 'redaksikabar.com',
    'getimell.com', 'discorded.io', 'tnhshop.site', 'paffoca.shop', 'allabilarskrotas.se', 'bossmanjack.lol',
    'lapanganrhama.biz', 'feelmyheartwithsong.com', 'apotekberjalan.com', 'fun-images.com', 'quatetaline.com',
    '0411cs.com', 'phobicpatiung.biz', 'risanmedia.id', 'mzastore.com', 'cilmiyom.online', 'inmolaryx.es', 'zephyrustech.co',
    'elite21miners.site', 'bbacademy.es', 'polatalam.network', 'qaclk.com', 'tipsgrid.com', 'vegetariansafitri.biz',
    'inly.vn', 'tiredecalz.com', 'chatgpt-ar.com', 'arenahiveai.com', 'nowbuyway.com', 'genjosam.com', 'buffmxh.net',
    'portalliveai.com', 'medanmacao.site', 'purearenas.com', 'iyfr.es', 'bgz2kl.com', 'mjg24.com', 'hubinstant.com',
    'kietnguyenisocial.com', 'tuongxanh.net', 'biscuitvn.xyz', 'racfq.com', 'taphoaclone.net', 'top10k.com', 'bahannes.network',
    'beraxs.id', 'krpbroadcasting.com', 'g8e8.com', 'hovanfood.com', 'fmuss.com', 'duniakeliling.com', 'mkualpmzac.cfd',
    'phucdpi3112.com', 'bestjoayo.com', 'mskintw.top', 'tradepopclick.com', 'doodj.com', 'braseniors.com', 'giangcho2000.asia',
    'reportfresh.com', 'thueotp.net', 'bemone.com', 'adgome.com', 'kreasianakkampoeng.com', 'anderbeck.se', 'dpcdn.cn',
    'gakhum.com', 'seangroup.org', 'clone79.com', 'bmuss.com', 'deepsdigitals.xyz', 'unioc.asia', 'fitanu.info',
    'storetaikhoan.com', 'zumruttepe.com', 'kongtoan.com', 'webpromailbox.com', 'skyjetnet.com', 'pdaoffice.com',
    'kemalcaz.cfd', 'lurekmazcm.cfd', 'tainguyenfbchat.com', 'minedwarfpoolstop.online', 'usgpeople.es', 'duccong.pro',
    'likevippro.site', 'binhvt.com', 'belugateam.info', 'giayhieucu.com', 'gioidev.news', 'suryapasti.com', 'brandshield-ip.com',
    'hareketliler.network', 'formilaraibot.vip', 'arthurgerex.network', 'zmedia.cloud', 'getmail1.com', 'webinarmoa.com',
    'maklacpolza.cfd', 'sangvt.com', 'disipulo.com', 'paneltiktok.com', 'thip-like.com', 'onlinecmail.com', 'abdullaaaa.online',
    'nutrijoayo.com', 'nimrxd.com', 'sonpu.xyz', 'tqc-sheen.com', 'sinbox.asia', 'faultydeniati.net', 'sarawakreport.com',
    'sumberakun.com', 'flameoflovedegree.com', 'hmuss.com', 'doteluxe.com', 'khongtontai.tech', 'iskiie.info',
    'pp-ahbaab-al-ikhlash.com', 'mmo05.com', 'linkhivezone.com', 'thinhmin.com', 'ikanchana.com', 'sentimentdate.com',
    'edgenestlab.com', 'sparkpool.info', 'murahpanel.com', 'tracklacker.com', 'plusfitgate.com', 'vcsid.com', 'emg.pw',
    'marketmail.info', 'cakybo.com', 'quangvps.com', 'tatotzracing.com', 'capcutgw.cfd', 'baseon.click', 'pafasdigital.com',
    'mrdmn.com', 'alpersadikan.sbs', 'mmo01.com', 'zubairnews.com', 'virtualfelecia.net', 'hastynurintan.io',
    'overwhelminghafizhul.io', 'optimisticheart.org', 'wamerangkul.com', 'cabaininin.io', 'teriguyaqin.biz', 'underdosejkt.org',
    'fotokults.de', 'trypodgrid.com', 'lmkopknh.cfd', 'maildoc.org', 'depinpools.com', 'haanhwedding.vn', 'fatunaric.cfd',
    'nowfitpro.com', 'mekikcek.network', 'angiiidayyy.click', 'scanupdates.info', 'mailserv.info', 'hieu0971927498.com',
    'kimgmail.com', 'wavewon.com', 'radiantliving.org', 'longsieupham.online', 'yagmursarkasla.sbs', 'domail.info',
    'boxmailvn.space', 'statisho.com', 'mailb.info', 'vietmail.xyz', 'animalkingdo.com', 'ncnmedia.net', 'xmuss.com',
    'phanmemmaxcare.com', 'futilesandilata.net', 'plusfitpoint.com', 'worldquickai.com', 'parkers4events.com', 'hsmultirental.com',
    'gaosuamedia.com', 'taptopsmart.com', 'macmail.info', 'janjiabdurrohim.biz', 'spotifyindo.com', 'hulas.co',
    'inderbeck.se', 'xusieure.com', 'financialemail.org', 'shinycash.email', 'asadultcontent.com', 'qazdo.com',
    'tapetadad.com', 'freehostingyou.com', 'quequeremos.com', 'gamemaker.nl', 'nfovpn.com', 'hornyalisa.com',
    'hothearts.me', 'princesscuties.com', 'lovelytruth.com', 'torrinrachildzz.com', 'ericson.ml', 'principalcreditos.es',
    'luisgill.xyz', 'professionalseo.net', '578rf.com', 'frepsalan.es', 'suntano.com', 'giveusaball.com', 'buje.one',
    'digitalbonus.net', 'usads.net', 'infraoregon.us', 'beautifuletters.com', 'openarmsevents.com', 'bekflipper.com',
    'secondreich.com', '4eol.com', 'presentchurch.com', 'vegamail.ga', 'osumbet.us', 'videogamecrush.com',
    'e-mail.americano.com', 'allstarsearch.com', 'pupuk.ml', 'edugram.com', 'berkenalanemos.com', 'myfeedmeals.com',
    'darlorin.tk', 'adminservicios.ceo', 'kajeno.net', 'alphabetaalpha.com', 'mailinator.net', 'mailinator.org',
    'mailinator.gq', 'mailinator.ml', 'mailinator.ga', 'mailinator.cf', 'mailinator2.com', 'spamherelots.com',
    'binkmail.com', 'thisisnotmyrealemail.com', 'safetymail.info', 'suremail.info', 'spambob.com', 'kurzepost.de',
    'lifebyfood.com', 'objectmail.com', 'spamcon.org', 'sweetpotato.ml', 'spamspot.com', 'spamfree24.org',
    'metaping.com', '0815.su', 'fixmail.cf', 'nofi7.com', 'nomail.cf', 'noclickemail.com', 'freemail.tur',
    'nospamfor.us', 'intopwa.com', 'maildig.com', 'guerrilla.email', 'guerrillamailblock.com', 'sharklasers.com',
    'pokemail.net', 'spam4.me', 'grr.la', '10minutelink.com', 'guerrillamail.org', 'guerrillamail.net',
    'guerrillamail.de', 'guerrillamail.com', 'guerrillamail.biz', 'guerrillamail.info', 'guerrillamail.org',
    'shuffle.email', 'armyspy.com', 'cust.in', 'cmail.club', '15qm-mail.red', 'throwaway.email', 'temp-mail.org',
    'temp-mail.ru', 'temp-mail.io', 'temp-mail.net', 'temp-mail.com', 'tempmailo.com', 'tempmailo.org', 'tempmailo.net',
    'tempail.com', '10minut.email', '10minutemail.com', '10minutemail.ru', '10minutemail.net', '10minutemail.org',
    '10minutemail.pro', '10minutemail.co.uk', '10minutemail.co.za', '10minute.email', '10minuteemail.com', '10minvm.email',
    '10minvm.net', '10minvm.org', '10min-mail.com', 'temppost.de', 'temp-inbox.com', 'temp-inbox.net', 'tempinbox.com',
    'temp-in.box', 'templat.hu', 'temp.email', 'temporarily.de', 'temporary.email', 'temporaryemail.org', 'throwaway.com',
    'throwawaymail.com', 'trash-mail.com', 'trash-mail.at', 'trash-mail.de', 'trash-mail.nl', 'trashmail.me',
    'trashmail.net', 'trashmail.org', 'trashmail.ws', 'trashya.com', 'trashymail.com', 'yopmail.fr', 'yopmail.net',
    'yopmail.org', 'yopmail.gq', 'yopmail.ml', 'yopmail.ga', 'yopmail.cf', 'yopmail.biz', 'yopmail.info', 'yopmail.com',
    'yopmail.2', 'cool.fr.nf', 'courripied.com', 'guerrillamail.org', 'guerrillamail.biz', 'guerrillamail.info',
    'guerrillamail.net', 'guerrillamail.de', 'guerrillamail.com', 'spam4.me', 'sharklasers.com', 'grr.la', 'pokemail.net',
    'guerrillamailblock.com', '10minutemail.co.za', '10minutemail.co.uk', '10minutemail.com', '10minutemail.net',
    '10minutemail.org', '10minutemail.pro', '10minutemail.ru', '10minut.email', '10minute.email', '10minuteemail.com',
    '10minvm.email', '10minvm.net', '10minvm.org', '10min-mail.com', '10minute-mail.com', 'guerrilla.click', 'sharklaser.com',
    'gmailnator.com', 'tempail.com', 'guerrillamailde.com', 'temp-mail.org', 'temp-mail.ru', 'temp-mail.io', 'temp-mail.net',
    'temp-mail.com', 'tempmailo.com', 'tempmailo.org', 'tempmailo.net', '10minutemail.ru', '10minutemail.net', '10minutemail.org',
    '10minutemail.pro', '10minutemail.co.uk', '10minutemail.co.za', '10minute.email', '10minuteemail.com', '10minvm.email',
    '10minvm.net', '10minvm.org', '10min-mail.com', '10min-mail.org', '10minutemail.me', '10minutemail.eu', '10minutemail.de',
    '10minutemail.ch', '10minutemail.at', '10minutemail.be', '10minutemail.cc', '10minutemail.cn', '10minutemail.fi',
    '10minutemail.fr', '10minutemail.it', '10minutemail.li', '10minutemail.lt', '10minutemail.lu', '10minutemail.me',
    '10minutemail.nl', '10minutemail.no', '10minutemail.pl', '10minutemail.pt', '10minutemail.ro', '10minutemail.se',
    '10minutemail.sg', '10minutemail.sk', '10minutemail.us', '10minutemail.ws', '20minutemail.com', '2prong.com',
    '30minutemail.com', '3d-painting.com', '33mail.com', 'bbesll.com', 'binkmail.com', 'burnthespam.info',
    'burstmail.info', 'cannoncrew.com', 'careless-whisper.com', 'casioblaka.com', 'casio-loto.it', 'cedarfalls.com',
    'cheatmail.de', 'childsavetrust.org', 'clevelandbay.it', 'clrmail.com', 'computersciencesquad.com', 'cool.fr.nf',
    'courripied.com', 'crapmail.org', 'crazymailing.com', 'cubiclink.com', 'curryworld.de', 'cust.in', 'cutout.club',
    'd3p.dk', 'dacha-24.ru', 'dandikmail.com', 'dayrep.com', 'deadfake.cf', 'deadaddress.com', 'deadspam.com',
    'despam.it', 'deyom.com', 'dfgh.net'];

  // External sources for domain lists
  private readonly defaultExternalSources = [
    'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/domains.txt',
    'https://raw.githubusercontent.com/7c/fakefilter/main/txt/data.txt',
    'https://raw.githubusercontent.com/wesbos/burner-email-providers/master/emails.txt'
  ];

  constructor(config: TempDomainConfig = {}) {
    this.config = {
      localStoragePath: path.join(process.cwd(), 'temp-domains.json'),
      autoUpdate: true,
      updateIntervalHours: 24,
      externalSources: this.defaultExternalSources,
      customDomains: [],
      ...config
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load domains from local storage
      await this.loadFromStorage();
      
      // If no domains loaded or auto-update enabled, fetch from external sources
      if (this.domains.size === 0 || this.config.autoUpdate) {
        await this.updateFromExternalSources();
      }

      // Set up automatic updates
      if (this.config.autoUpdate) {
        this.setupAutoUpdate();
      }
    } catch (error) {
      console.warn('Failed to initialize temp domain service, using built-in list:', error);
      this.loadBuiltInDomains();
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const data = await fs.readFile(this.config.localStoragePath, 'utf8');
      const parsed = JSON.parse(data);
      
      if (parsed.domains && Array.isArray(parsed.domains)) {
        this.domains = new Set(parsed.domains);
        this.lastUpdate = parsed.lastUpdate ? new Date(parsed.lastUpdate) : null;
      }
    } catch (error) {
      // File doesn't exist or is corrupted, will use built-in domains
      this.loadBuiltInDomains();
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        domains: Array.from(this.domains),
        lastUpdate: this.lastUpdate?.toISOString(),
        version: '1.0.0'
      };

      await fs.writeFile(this.config.localStoragePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to save temp domains to storage:', error);
    }
  }

  private loadBuiltInDomains(): void {
    this.domains = new Set([...this.builtInDomains, ...this.config.customDomains]);
  }

  private async updateFromExternalSources(): Promise<void> {
    const newDomains = new Set(this.domains);
    
    // Add custom domains
    this.config.customDomains.forEach(domain => newDomains.add(domain.toLowerCase()));
    
    // Add built-in domains
    this.builtInDomains.forEach(domain => newDomains.add(domain));

    // Fetch from external sources
    for (const source of this.config.externalSources) {
      try {
        console.log(`Updating temp domains from: ${source}`);
        const response = await axios.get(source, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'trial-abuse-guard/1.0.0'
          }
        });
        
        const domains = this.parseDomainList(response.data);
        domains.forEach(domain => newDomains.add(domain.toLowerCase()));
        
        console.log(`Added ${domains.length} domains from ${source}`);
      } catch (error) {
        console.warn(`Failed to fetch domains from ${source}:`, error instanceof Error ? error.message : String(error));
      }
    }

    if (newDomains.size > this.domains.size) {
      this.domains = newDomains;
      this.lastUpdate = new Date();
      await this.saveToStorage();
      console.log(`Updated temp domain list: ${this.domains.size} total domains`);
    }
  }

  private parseDomainList(data: string): string[] {
    return data
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('//'))
      .filter(line => this.isValidDomain(line));
  }

  private isValidDomain(domain: string): boolean {
    // Basic domain validation
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  private setupAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    const intervalMs = this.config.updateIntervalHours * 60 * 60 * 1000;
    this.updateTimer = setInterval(() => {
      this.updateFromExternalSources().catch(error => {
        console.warn('Auto-update failed:', error);
      });
    }, intervalMs);
  }

  /**
   * Check if a domain is in the temporary email list
   */
  isDomainTemporary(domain: string): boolean {
    return this.domains.has(domain.toLowerCase());
  }

  /**
   * Get all temporary domains
   */
  getAllDomains(): string[] {
    return Array.from(this.domains).sort();
  }

  /**
   * Get domain count
   */
  getDomainCount(): number {
    return this.domains.size;
  }

  /**
   * Add custom domain(s) to the list
   */
  async addDomains(domains: string | string[]): Promise<void> {
    const domainsArray = Array.isArray(domains) ? domains : [domains];
    let added = 0;

    for (const domain of domainsArray) {
      const normalized = domain.toLowerCase().trim();
      if (this.isValidDomain(normalized) && !this.domains.has(normalized)) {
        this.domains.add(normalized);
        added++;
      }
    }

    if (added > 0) {
      await this.saveToStorage();
      console.log(`Added ${added} custom temp domains`);
    }
  }

  /**
   * Remove domain(s) from the list
   */
  async removeDomains(domains: string | string[]): Promise<void> {
    const domainsArray = Array.isArray(domains) ? domains : [domains];
    let removed = 0;

    for (const domain of domainsArray) {
      const normalized = domain.toLowerCase().trim();
      if (this.domains.has(normalized)) {
        this.domains.delete(normalized);
        removed++;
      }
    }

    if (removed > 0) {
      await this.saveToStorage();
      console.log(`Removed ${removed} temp domains`);
    }
  }

  /**
   * Force update from external sources
   */
  async forceUpdate(): Promise<void> {
    console.log('Forcing update of temp domain list...');
    await this.updateFromExternalSources();
  }

  /**
   * Get last update timestamp
   */
  getLastUpdate(): Date | null {
    return this.lastUpdate;
  }

  /**
   * Get update statistics
   */
  getStats(): {
    totalDomains: number;
    lastUpdate: Date | null;
    autoUpdateEnabled: boolean;
    updateInterval: number;
    sources: string[];
  } {
    return {
      totalDomains: this.domains.size,
      lastUpdate: this.lastUpdate,
      autoUpdateEnabled: this.config.autoUpdate,
      updateInterval: this.config.updateIntervalHours,
      sources: this.config.externalSources
    };
  }

  /**
   * Search domains by pattern
   */
  searchDomains(pattern: string): string[] {
    const regex = new RegExp(pattern, 'i');
    return Array.from(this.domains).filter(domain => regex.test(domain));
  }

  /**
   * Export domains to file
   */
  async exportDomains(filePath: string, format: 'json' | 'txt' = 'json'): Promise<void> {
    const domains = Array.from(this.domains).sort();
    
    if (format === 'json') {
      const data = {
        domains,
        count: domains.length,
        lastUpdate: this.lastUpdate?.toISOString(),
        exportedAt: new Date().toISOString()
      };
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } else {
      await fs.writeFile(filePath, domains.join('\n'));
    }
  }

  /**
   * Import domains from file
   */
  async importDomains(filePath: string): Promise<number> {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      let domains: string[] = [];

      if (filePath.endsWith('.json')) {
        const parsed = JSON.parse(data);
        domains = parsed.domains || parsed;
      } else {
        domains = this.parseDomainList(data);
      }

      await this.addDomains(domains);
      return domains.length;
    } catch (error) {
      throw new Error(`Failed to import domains: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clear all domains and reload defaults
   */
  async reset(): Promise<void> {
    this.domains.clear();
    this.loadBuiltInDomains();
    await this.saveToStorage();
    console.log('Reset temp domain list to defaults');
  }

  /**
   * Cleanup - stop auto-updates
   */
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
}
