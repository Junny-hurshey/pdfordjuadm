/* 파킨슨 입원관리 시스템 - 설정 파일
   이 파일만 수정하면 전체 시스템에 적용됩니다 */

window.APP_CONFIG = {

  // Google AI Studio에서 발급: https://aistudio.google.com
  GEMINI_API_KEY: 'AIzaSyABjnwmEmLT5tMq8N4rRcwLoBseYSAJubA',

  // Apps Script 배포 후 받은 웹앱 URL
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyGASxYEZsrH_3hxbPnwDKy0q31Vk3RTDg9TDf9uJbFraymNi1R0NSUmcKxfgn_yOR2/exec',

  // 병원 정보 (필요시 수정)
  HOSPITAL: {
    name: '대전대학교 대전한방병원',
    department: '뇌신경센터',
    doctor: '류호룡',
    room: '21진료실',
    phone: '042-470-9131',
    address: '대전광역시 서구 대덕대로 176번길 75'
  }
};
