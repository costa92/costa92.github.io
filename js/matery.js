$(function () {
    // 弹层打开时把 Tab 焦点限制在内部
    let trapFocus = function (container, e) {
        if (e.key !== 'Tab') return;
        let items = Array.prototype.filter.call(
            container.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'),
            function (el) { return el.offsetParent !== null; });
        if (!items.length) return;
        let first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };

    /*菜单切换*/
    let $burger = $('.dp-burger');
    $('.sidenav').sidenav({
        onOpenEnd: function (el) {
            $burger.attr('aria-expanded', 'true');
            let firstLink = el.querySelector('a[href]');
            if (firstLink) firstLink.focus();
        },
        onCloseEnd: function () {
            $burger.attr('aria-expanded', 'false');
            if ($burger.is(':visible')) $burger[0].focus();
        }
    });
    $('#mobile-nav').on('keydown', function (e) {
        if (e.key === 'Escape') M.Sidenav.getInstance(this).close();
        else trapFocus(this, e);
    });

    /* 修复文章卡片 div 的宽度. */
    let fixPostCardWidth = function (srcId, targetId) {
        let srcDiv = $('#' + srcId);
        if (srcDiv.length === 0) {
            return;
        }

        let w = srcDiv.width();
        if (w >= 450) {
            w = w + 21;
        } else if (w >= 350 && w < 450) {
            w = w + 18;
        } else if (w >= 300 && w < 350) {
            w = w + 16;
        } else {
            w = w + 14;
        }
        $('#' + targetId).width(w);
    };

    /**
     * 修复footer部分的位置，使得在内容比较少时，footer也会在底部.
     */
    let fixFooterPosition = function () {
        $('.content').css('min-height', window.innerHeight - 165);
    };

    /**
     * 修复样式.
     */
    let fixStyles = function () {
        fixPostCardWidth('navContainer');
        fixPostCardWidth('artDetail', 'prenext-posts');
        fixFooterPosition();
    };
    fixStyles();

    /*调整屏幕宽度时重新设置文章列的宽度，修复小间距问题*/
    $(window).resize(function () {
        fixStyles();
        // 窗口跨断点变化时刷新瀑布流布局
        if ($articles.length > 0) {
            $articles.masonry('layout');
        }
    });

    /*初始化瀑布流布局*/
    var $articles = $('#articles');
    if (!$.fn.masonry) $articles = $();
    if ($articles.length > 0) {
        $articles.masonry({
            itemSelector: '.article',
            columnWidth: '.article',
            percentPosition: true
        });

        // 图片加载后刷新布局
        $articles.find('img').on('load', function() {
            $articles.masonry('layout');
        });
        setTimeout(function() {
            $articles.masonry('layout');
        }, 300);
    }

    // 首页不加载 AOS/masonry/lightGallery（见 layout.ejs），这里按需初始化
    if (window.AOS) AOS.init({
        easing: 'ease-in-out-sine',
        duration: 700,
        delay: 100,
        once: true
    });

    /*文章内容详情的一些初始化特性*/
    let articleInit = function () {
        // External links already receive target="_blank" during rendering.
        // Keep local and section links in the current tab.
        $('#articleContent .headerlink').each(function () {
            var heading = this.parentElement;
            if (heading && /^H[1-6]$/.test(heading.tagName)) {
                heading.setAttribute('aria-label', heading.textContent.trim());
            }
        });

        $('#articleContent img').each(function () {
            let imgPath = $(this).attr('src');
            $(this).wrap('<div class="img-item" data-src="' + imgPath + '" data-sub-html=".caption"></div>');
            // 图片添加阴影
            $(this).addClass("img-shadow img-margin");
            // 图片添加字幕
            let alt = $(this).attr('alt');
            let title = $(this).attr('title');
            let captionText = "";
            // 如果alt为空，title来替
            if (alt === undefined || alt === "") {
                if (title !== undefined && title !== "") {
                    captionText = title;
                }
            } else {
                captionText = alt;
            }
            // 字幕不空，添加之
            if (captionText !== "") {
                let captionDiv = document.createElement('div');
                captionDiv.className = 'caption';
                let captionEle = document.createElement('b');
                captionEle.className = 'center-caption';
                captionEle.innerText = captionText;
                captionDiv.appendChild(captionEle);
                this.insertAdjacentElement('afterend', captionDiv)
            }
        });
        if ($.fn.lightGallery) $('#articleContent, #myGallery').lightGallery({
            selector: '.img-item',
            // 启用字幕
            subHtmlSelectorRelative: true
        });

        // progress bar init
        const progressElement = window.document.querySelector('.progress-bar');
        if (progressElement) {
            new ScrollProgress((x, y) => {
                progressElement.style.width = y * 100 + '%';
            });
        }
    };
    articleInit();

    // 文章卡片的 transform/backdrop-filter 会改变 fixed 弹窗的定位参照。
    // 将打赏弹窗移出卡片，使其始终相对当前视口居中显示。
    $('#rewardModal').appendTo(document.body);
    $('.modal').modal({
        onOpenEnd: function (el, trigger) {
            el._returnFocus = trigger;
            let input = el.querySelector('input');
            (input || el).focus();
        },
        onCloseEnd: function (el) {
            if (el._returnFocus) el._returnFocus.focus();
        }
    });
    $('.modal').on('keydown', function (e) { trapFocus(this, e); });

    /*回到顶部*/
    $('#backTop').click(function () {
        let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        $('body,html').animate({scrollTop: 0}, reduceMotion ? 0 : 400);
        // 焦点跟着回到页面顶部，键盘用户不必再从页尾 Tab 回来
        document.getElementById('content-start').focus({preventScroll: true});
        return false;
    });

    /*监听滚动条位置*/
    let $nav = $('#headNav');
    let $backTop = $('.top-scroll');
    let lastScrollTop = 0;
    let navbarHeight = $nav.outerHeight() || 64;
    // 当页面处于文章中部的时候刷新页面，因为此时无滚动，所以需要判断位置,给导航加上绿色。
    showOrHideNavBg($(window).scrollTop());
    $(window).scroll(function () {
        /* 回到顶部按钮根据滚动条的位置的显示和隐藏.*/
        let scroll = $(window).scrollTop();
        showOrHideNavBg(scroll);

        /* 智能导航栏：向下滚动隐藏，向上滚动显示 */
        let $cover = $('.bg-cover, .index-cover').first();
        let showPosition = $cover.length > 0 ? $cover.outerHeight() - 64 : 100;
        if (scroll > showPosition) {
            if (scroll > lastScrollTop && scroll > navbarHeight) {
                // 向下滚动 -> 隐藏
                $nav.addClass('navbar-hidden');
            } else {
                // 向上滚动 -> 显示
                $nav.removeClass('navbar-hidden');
            }
        } else {
            $nav.removeClass('navbar-hidden');
        }
        lastScrollTop = scroll;
    });

    function showOrHideNavBg(position) {
        let $cover = $('.bg-cover, .index-cover').first();
        let showPosition = $cover.length > 0 ? $cover.outerHeight() - 64 : 100;
        if (position < showPosition) {
            $nav.addClass('nav-transparent');
            $backTop.slideUp(300);
        } else {
            $nav.removeClass('nav-transparent');
            $backTop.slideDown(300);
        }
    }


	// 桌面端：hover 显示/隐藏子菜单
	$(".nav-menu > li.has-children").hover(function(){
		$(this).addClass('nav-show').siblings('li').removeClass('nav-show');
	},function(){
		$(this).removeClass('nav-show');
	});

	// 阻止有子菜单的父级链接跳转
	$(".nav-menu > li.has-children > a.dropdown-trigger-nav").on('click', function(e){
		e.preventDefault();
		e.stopPropagation();
	});

    $('.m-nav-toggle').on('click', function () {
        var $toggle = $(this);
        var $submenu = $('#' + $toggle.attr('aria-controls'));
        var opening = $toggle.attr('aria-expanded') !== 'true';
        $('.m-nav-toggle').not($toggle).attr('aria-expanded', 'false');
        $('.m-nav-item').children('ul').not($submenu).stop(true, true).slideUp(100);
        $('.m-nav-item.m-nav-show').removeClass('m-nav-show');
        $toggle.attr('aria-expanded', String(opening));
        $toggle.parent('li').toggleClass('m-nav-show', opening);
        $submenu.stop(true, true)[opening ? 'slideDown' : 'slideUp'](100);
    });

    // 初始化加载 tooltipped.
    $('.tooltipped').tooltip();

    // 图片懒加载淡入效果
    $('.card .card-image img').each(function() {
        var $img = $(this);
        if (this.complete) {
            $img.addClass('loaded');
        } else {
            $img.on('load', function() {
                $img.addClass('loaded');
            });
            $img.on('error', function() {
                $img.addClass('loaded');
            });
        }
    });
});

// 站点已由 obsidian.css 改为「暗色优先」。旧的 legacy 黑夜模式（dark.css 的
// filter:invert hack）会把新皮肤反转，故停用夜间提醒 toast 与 DarkMode 自动应用，
// 并始终保证 body 不带 DarkMode 类，避免与 Obsidian Aurora 皮肤冲突。
document.body.classList.remove('DarkMode');
