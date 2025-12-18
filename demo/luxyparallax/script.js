luxy.init({
    wrapper: "#luxy", // 慣性スクロールを囲む要素のID
    targets: ".luxy-el", // パララックスの要素のclass名
    wrapperSpeed: 0.08, // スクロールスピード
  });

 $(function(){
  let tabs = $(".tab");
  tabs .on('click', function(){
    $('.active').removeClass('active');
    $(this).addClass('active');
    const index = tabs.index(this);
    $('.content').removeClass('show').eq(index).addClass('show');
  });
 });