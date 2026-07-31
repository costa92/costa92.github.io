// 代码块语言识别

$(function () {
  var $highlight_lang = $('<div class="code_lang" title="代码语言"></div>');

  $('pre').before($highlight_lang);
  $('pre').each(function () {
    var code_language = $(this).attr('class');

    if (!code_language) {
      return true;
    };
    // 全局替换 language-：兜底个别文章围栏误写成 ```language-bash 造成的 language-language-bash 双前缀
    var lang_name = code_language.replace("line-numbers", "").trim().replace(/language-/g, "").trim();

    // 首字母大写
    // lang_name = lang_name.slice(0, 1).toUpperCase() + lang_name.slice(1);
    
    $(this).siblings(".code_lang").text(lang_name);
  });
});
