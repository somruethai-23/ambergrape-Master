import '/tinymce/tinymce.min.js';

// นำเข้า theme และ plugins ที่ต้องการใช้
import '/tinymce/themes/silver/theme.js';
import '/tinymce/plugins/link/plugin.js';
import '/tinymce/plugins/table/plugin.js';
import '/tinymce/plugins/lists/plugin.js';

// ตั้งค่า TinyMCE
tinymce.init({
  selector: '#description',  // เลือก textarea ที่คุณต้องการผูก TinyMCE
  plugins: 'link table lists',
  toolbar: 'undo redo | styleselect | bold italic | link | alignleft aligncenter alignright | bullist numlist outdent indent | table',
  icons: 'default',
  base_url: '/tinymce',  // เส้นทางพื้นฐานสำหรับการโหลดไฟล์ TinyMCE
  suffix: '.min' // ใช้ไฟล์ .min.js
});
