/**
 * 파킨슨병 입원관리 시스템 - Apps Script v2
 * index.html 실제 데이터 구조에 맞춤
 *
 * 시트 구조:
 *  ① 입원접수    - 기본정보 + 예약정보 + 메타
 *  ② 증상평가    - 운동/비운동 점수 + 합산
 *  ③ 전구증상    - 6가지 전구증상 선후관계
 *  ④ 약물        - 레보도파 + 기타약물
 *  ⑤ 현병력PI    - 시간축 + pi_auto
 *  ⑥ 원본데이터  - 전체 JSON
 *
 * 배포: 웹앱 > 액세스: 모든 사용자 > 새 배포
 */

// ─── 설정 ───
// 독립형 스크립트: 아래에 스프레드시트 ID 직접 입력
// 스프레드시트에 바인딩된 스크립트: 빈 문자열로 두면 자동 감지
var SHEET_ID = '';

function getSS() {
  if (SHEET_ID) return SpreadsheetApp.openById(SHEET_ID);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  // 둘 다 없으면 새 스프레드시트 생성
  ss = SpreadsheetApp.create('파킨슨 입원관리 데이터');
  SHEET_ID = ss.getId();
  Logger.log('새 스프레드시트 생성: ' + ss.getUrl());
  return ss;
}

function getOrCreateSheet(name, headers) {
  var ss = getSS();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#0f6e56')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ─── 헤더 정의 ───
var H_접수 = [
  '접수번호','접수유형','제출시간',
  '환자명','생년월일','성별','연락처','주소',
  '보호자동반','보호자명','보호자연락처','협회소개',
  '희망입원일1','희망입원일2','입원기간','입원목적','내원경로','추가요청'
];

var H_증상 = [
  '접수번호','환자명',
  '말하기','떨림','서동','강직','보행','보행동결','운동합산',
  '수면','변비','후각','피로','인지','우울불안','통증','기립어지럼','배뇨','연하','비운동합산'
];

var H_전구 = [
  '접수번호','환자명',
  '변비','변비_선후','변비_시점',
  '후각저하','후각_선후','후각_시점',
  'RBD','RBD_선후','RBD_시점','RBD_목격자','RBD_PSG',
  '기립성','기립_선후','기립_시점',
  '배뇨장애','배뇨_선후','배뇨_시점',
  '성기능','성기능_선후','성기능_시점'
];

var H_약물 = [
  '접수번호','환자명',
  '레보도파복용','약품명','용량횟수','복용시작','Wearing-off','Dyskinesia',
  '기타약물','한약건기식영양제'
];

var H_PI = [
  '접수번호','환자명',
  '처음이상시점','처음증상','첫운동증상시점','운동증상종류','시작부위',
  '장뇌선후','진단시점','진단병원','레보도파시작',
  '과거력','가족력','과거력메모',
  'PI자동생성'
];

var H_원본 = [
  '접수번호','환자명','제출시간','JSON'
];

// ─── 값 변환 헬퍼 ───
function v(d, k) { return d[k] != null ? String(d[k]) : ''; }
function arr(d, k) { return Array.isArray(d[k]) ? d[k].join(', ') : (d[k] || ''); }
function yn(val) {
  if (val === 'yes') return '예';
  if (val === 'no') return '아니오';
  return val || '';
}
function beforeMotor(val) {
  if (val === 'yes') return '운동증상 이전';
  if (val === 'no') return '운동증상 이후';
  if (val === 'unclear') return '모름';
  return val || '';
}
function gender(val) {
  if (val === 'male') return '남';
  if (val === 'female') return '여';
  return val || '';
}
function motorType(val) {
  var m = {tremor:'손/발 떨림',brady:'동작 느려짐',rigid:'근육 뻣뻣함',gait:'걸음 이상',mixed:'복합',unclear:'모름'};
  return m[val] || val || '';
}
function side(val) {
  var m = {right:'우측',left:'좌측',bilateral:'양측',unclear:'모름'};
  return m[val] || val || '';
}
function gutBrain(val) {
  var m = {gut:'장 증상 먼저',brain:'뇌/운동 먼저',same:'동시',unclear:'모름'};
  return m[val] || val || '';
}
function duration(val) {
  var m = {'1week':'1주','2week':'2주','3week':'3주','4week':'4주 이상','undecided':'미정'};
  return m[val] || val || '';
}
function route(val) {
  var m = {assoc:'협회 소개',hospital:'타 병원 의뢰',internet:'인터넷',acquaintance:'지인',existing:'기존 외래'};
  return m[val] || val || '';
}
function flowType(val) {
  if (val === 'reservation') return '입원예약+문진';
  if (val === 'survey') return '문진만';
  return val || '';
}
function score(d, k) {
  var n = parseInt(d[k]);
  return (!isNaN(n) && n >= 0) ? n : '';
}

// ─── 접수번호 생성 ───
function makeRef() {
  var now = new Date();
  var ymd = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd');
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var rand = '';
  for (var i = 0; i < 5; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'PD-' + ymd + '-' + rand;
}

// ─── doPost ───
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status:'error',message:'서버 사용 중입니다. 잠시 후 다시 시도해주세요.'}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var d = JSON.parse(e.postData.contents);
    var ref = makeRef();
    var ts = d.submitted_at || new Date().toISOString();
    var name = v(d, 'patient_name');

    // ① 입원접수
    getOrCreateSheet('입원접수', H_접수).appendRow([
      ref, flowType(d.flow_type), ts,
      name, v(d,'patient_birth'), gender(d.patient_gender), v(d,'patient_phone'), v(d,'patient_address'),
      yn(d.cg_yn), v(d,'cg_name'), v(d,'cg_phone'), yn(d.via_assoc),
      v(d,'admit_date1'), v(d,'admit_date2'), duration(d.admit_duration), arr(d,'admit_purpose'), route(d.admit_route), v(d,'admit_note')
    ]);

    // ② 증상평가
    var mSum = (d.updrs_motor_total != null) ? d.updrs_motor_total : '';
    var nmSum = (d.updrs_nonmotor_total != null) ? d.updrs_nonmotor_total : '';
    getOrCreateSheet('증상평가', H_증상).appendRow([
      ref, name,
      score(d,'motor_speech'), score(d,'motor_tremor'), score(d,'motor_brady'),
      score(d,'motor_rigid'), score(d,'motor_gait'), score(d,'motor_freezing'), mSum,
      score(d,'nm_sleep'), score(d,'nm_constipation'), score(d,'nm_hyposmia'),
      score(d,'nm_fatigue'), score(d,'nm_cognition'), score(d,'nm_depression'),
      score(d,'nm_pain'), score(d,'nm_orthostasis'), score(d,'nm_urinary'), score(d,'nm_swallow'), nmSum
    ]);

    // ③ 전구증상
    getOrCreateSheet('전구증상', H_전구).appendRow([
      ref, name,
      yn(d.constipation), beforeMotor(d.constipation_before_motor), v(d,'constipation_onset'),
      yn(d.hyposmia), beforeMotor(d.hyposmia_before_motor), v(d,'hyposmia_onset'),
      yn(d.rbd), beforeMotor(d.rbd_before_motor), v(d,'rbd_onset'), yn(d.rbd_witnessed), yn(d.rbd_psg),
      yn(d.orthostasis), beforeMotor(d.orthostasis_before_motor), v(d,'orthostasis_onset'),
      yn(d.urinary), beforeMotor(d.urinary_before_motor), v(d,'urinary_onset'),
      yn(d.sexual), beforeMotor(d.sexual_before_motor), v(d,'sexual_onset')
    ]);

    // ④ 약물
    getOrCreateSheet('약물', H_약물).appendRow([
      ref, name,
      yn(d.levo_yn), v(d,'levo_name'), v(d,'levo_dose'), v(d,'levo_start'),
      yn(d.wearing_off), yn(d.dyskinesia),
      v(d,'other_meds'), v(d,'supplements')
    ]);

    // ⑤ 현병력PI
    getOrCreateSheet('현병력PI', H_PI).appendRow([
      ref, name,
      v(d,'first_abnormal_date'), v(d,'first_abnormal_symptom'),
      v(d,'first_motor_date'), motorType(d.first_motor_type), side(d.motor_onset_side),
      gutBrain(d.gut_brain_onset), v(d,'pd_diagnosis_date'), v(d,'pd_diagnosis_hospital'), v(d,'levodopa_start_date'),
      arr(d,'pmh'), arr(d,'fh'), v(d,'pmh_note'),
      v(d,'pi_auto')
    ]);

    // ⑥ 원본데이터
    getOrCreateSheet('원본데이터', H_원본).appendRow([
      ref, name, ts, JSON.stringify(d)
    ]);

    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({status:'success',ref:ref}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    lock.releaseLock();
    // 에러 로그
    try {
      getOrCreateSheet('에러로그', ['시간','에러','데이터']).appendRow([
        new Date().toISOString(), err.toString(), e.postData.contents.substring(0, 5000)
      ]);
    } catch(e2) {}
    return ContentService.createTextOutput(JSON.stringify({status:'error',message:err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── doGet (상태 확인용) ───
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: '파킨슨 입원관리 시스템 API v2 정상',
    time: new Date().toISOString(),
    sheets: ['입원접수','증상평가','전구증상','약물','현병력PI','원본데이터']
  })).setMimeType(ContentService.MimeType.JSON);
}
