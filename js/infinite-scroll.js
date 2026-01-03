/**
 * 无限滚动瀑布流实现
 * Infinite Scroll Waterfall Implementation
 */
$(function () {
    'use strict';

    // 检查配置是否启用无限滚动
    if (!window.infiniteScrollConfig || !window.infiniteScrollConfig.enabled) {
        return;
    }

    const config = window.infiniteScrollConfig;
    let isLoading = false;
    let currentPage = config.currentPage;
    let hasNextPage = config.hasNext;

    const $window = $(window);
    const $document = $(document);
    const $articleContainer = $('#article-container');
    const $loadingIndicator = $('#loading-indicator');
    const $loadMoreEnd = $('#load-more-end');
    const $articles = $('#articles');

    /**
     * 显示加载指示器
     */
    function showLoading() {
        $loadingIndicator.fadeIn(300);
    }

    /**
     * 隐藏加载指示器
     */
    function hideLoading() {
        $loadingIndicator.fadeOut(300);
    }

    /**
     * 显示加载完成提示
     */
    function showLoadEnd() {
        $loadMoreEnd.fadeIn(300);
    }

    /**
     * 从服务器加载更多文章
     */
    function loadMorePosts() {
        if (isLoading || !hasNextPage) {
            return;
        }

        isLoading = true;
        showLoading();

        // 构建下一页URL
        const nextPageUrl = config.nextLink;

        $.ajax({
            url: nextPageUrl,
            type: 'GET',
            dataType: 'html',
            timeout: 10000,
            success: function(data) {
                try {
                    // 解析返回的HTML
                    const $newContent = $(data);
                    const $newArticles = $newContent.find('#article-container .article');

                    if ($newArticles.length > 0) {
                        // 为新文章添加初始样式
                        $newArticles.css('opacity', '0').css('transform', 'translateY(50px)');

                        // 添加到容器
                        $articleContainer.append($newArticles);

                        // 重新初始化瀑布流布局
                        $articles.masonry('appended', $newArticles);

                        // 动画显示新文章
                        $newArticles.each(function(index) {
                            const $article = $(this);
                            setTimeout(function() {
                                $article.css({
                                    'transition': 'opacity 0.6s ease, transform 0.6s ease',
                                    'opacity': '1',
                                    'transform': 'translateY(0)'
                                });

                                // 重新初始化AOS动画
                                if (typeof AOS !== 'undefined') {
                                    AOS.refresh();
                                }
                            }, index * 100);
                        });

                        // 添加hover效果
                        $newArticles.hover(function () {
                            $(this).addClass('animated pulse');
                        }, function () {
                            $(this).removeClass('animated pulse');
                        });

                        // 更新分页信息
                        currentPage++;

                        // 检查是否还有下一页
                        const $paginationInfo = $newContent.find('#pagination-info');
                        if ($paginationInfo.length > 0) {
                            const nextLink = $paginationInfo.data('next-link');
                            hasNextPage = !!nextLink;
                            config.nextLink = nextLink || '';
                        } else {
                            hasNextPage = false;
                        }

                        // 如果没有更多页面，显示完成提示
                        if (!hasNextPage) {
                            setTimeout(function() {
                                showLoadEnd();
                            }, 500);
                        }

                    } else {
                        hasNextPage = false;
                        showLoadEnd();
                    }

                } catch (error) {
                    console.error('解析新内容时出错:', error);
                    hasNextPage = false;
                    showLoadEnd();
                }
            },
            error: function(xhr, status, error) {
                console.error('加载更多文章失败:', error);
                // 显示错误提示
                const errorHtml = `
                    <div class="col s12">
                        <div class="card red lighten-4">
                            <div class="card-content red-text">
                                <i class="fas fa-exclamation-triangle"></i>
                                加载失败，请稍后重试
                            </div>
                        </div>
                    </div>
                `;
                $articleContainer.append(errorHtml);
            },
            complete: function() {
                isLoading = false;
                hideLoading();
            }
        });
    }

    /**
     * 检查是否需要加载更多内容
     */
    function checkLoadMore() {
        if (isLoading || !hasNextPage) {
            return;
        }

        const windowHeight = $window.height();
        const documentHeight = $document.height();
        const scrollTop = $window.scrollTop();
        const threshold = config.threshold || 300;

        // 当滚动到距离底部threshold像素时开始加载
        if (scrollTop + windowHeight >= documentHeight - threshold) {
            loadMorePosts();
        }
    }

    /**
     * 节流函数
     */
    function throttle(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 绑定滚动事件（使用节流）
    const throttledCheckLoadMore = throttle(checkLoadMore, 200);
    $window.on('scroll', throttledCheckLoadMore);

    // 页面加载完成后检查一次
    $document.ready(function() {
        // 确保瀑布流已初始化
        setTimeout(function() {
            checkLoadMore();
        }, 1000);
    });

    // 窗口大小改变时重新检查
    $window.on('resize', function() {
        setTimeout(checkLoadMore, 300);
    });

    console.log('无限滚动已启用，当前页：' + currentPage + '/' + config.totalPages);
});