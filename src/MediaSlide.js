import PropTypes from 'prop-types';
import { useEffect, useRef, useState, useCallback } from 'react';
import { version } from '../package.json';
import styles from './MediaSlide.module.css';
import Slider from 'react-slider';
import * as React from 'react';

/**
 * @description Renders a slideshow component with customizable display types, including
 * list, details, thumbnails, and slide views. It handles navigation, loading, and
 * rendering of media items, as well as resizing and layout adjustments based on the
 * viewport width.
 *
 * @param {object} props - Used for passing data to the component.
 *
 * @returns {JSX.Element} A virtual representation of a DOM element and can be rendered
 * to the browser using a library such as React.
 */
const MediaSlide = (props) => {
	const {
		gallery,
		defaultDisplayType,
		defaultNavbarHidden,
		defaultStageHidden,
		defaultThumbSize,
		defaultThumbSpacing,
		selectionChange,
		loading,
		onLoadMoreData,
		renderFile,
		pagination,
		initialSelection,
	} = props;

	let { renderBigInfo, listItemHTML, detailsItemHTML, thumbnailsItemHTML, slideItemHTML } = props;

	if (!listItemHTML) {
		listItemHTML = (click) => {
			return (item, s, thumbSpacing) => {
				return (
					<li
						style={{ paddingLeft: thumbSpacing, paddingRight: thumbSpacing, paddingBottom: thumbSpacing }}
						key={item.id}
						data-id={item.id}
						onClick={click(item)}
					>
						<a href={item.linkUrl}>
							<img src={item.thumb} width="32" alt={item.title} /> {item.title}
						</a>
					</li>
				);
			};
		};
	}
	if (!detailsItemHTML) {
		detailsItemHTML = (click, s, thumbSpacing) => {
			return (item) => {
				return (
					<tr>
						<td
							style={{
								paddingLeft: thumbSpacing,
								paddingRight: thumbSpacing,
								paddingBottom: thumbSpacing,
							}}
							key={item.id}
							data-id={item.id}
							onClick={click(item)}
						>
							<a href={item.linkUrl}>
								<img src={item.thumb} width="64" alt={item.title} /> {item.title}
							</a>
						</td>
					</tr>
				);
			};
		};
	}
	if (!thumbnailsItemHTML) {
		thumbnailsItemHTML = (click, ts, thumbSpacing) => {
			return (item) => {
				return (
					<li
						style={{ paddingLeft: thumbSpacing, paddingRight: thumbSpacing, paddingBottom: thumbSpacing }}
						key={item.id}
						data-id={item.id}
						onClick={click(item)}
					>
						<a href={item.linkUrl}>
							<img src={item.thumb} width={ts} alt={item.title} />
							<br />
							{item.title}
						</a>
					</li>
				);
			};
		};
	}
	if (!slideItemHTML) {
		slideItemHTML = (click, ts, thumbSpacing) => {
			return (item) => {
				// The 60 below is the number of pixels we reserve in the slide bar for the label
				return (
					<li
						style={{ paddingLeft: thumbSpacing, paddingRight: thumbSpacing, paddingBottom: thumbSpacing }}
						key={item.id}
						data-id={item.id}
						onClick={click(item)}
					>
						<a href={item.linkUrl}>
							<img src={item.thumb} height={ts - 80} alt={item.title} />
							<br />
							{item.title}
						</a>
					</li>
				);
			};
		};
	}
	const leftbarWidthRatio = 0.4;
	if (!renderBigInfo) {
		renderBigInfo = (i) => {
			return <></>;
		};
	}

	let page = 0,
		totalPages = 0,
		loadingIndicator = props?.loadingIndicator;
	if (!loadingIndicator) {
		loadingIndicator = 'Loading...';
	}
	if (pagination?.page) page = pagination.page;
	if (pagination?.totalPages) totalPages = pagination.totalPages;
	const [displayType, setDisplayType] = useState(defaultDisplayType || 'thumbnails');
	const [viewportHeight, setViewportHeight] = useState(100);
	const [thumbSize, setThumbSize] = useState(defaultThumbSize || 200);
	const [thumbSpacing, setThumbSpacing] = useState(defaultThumbSpacing || 0);
	const [selectedItem, setSelectedItem] = useState(null);
	const [firstPageLoaded, setFirstPageLoaded] = useState(page === 0);
	const [initialPage, setInitialPage] = useState(page);
	const [leftPageCursor, setLeftPageCursor] = useState(page);
	const [rightPageCursor, setRightPageCursor] = useState(page);
	const [navbarHeight, setNavbarHeight] = useState(defaultNavbarHidden ? 0 : 60);

	const [viewportWidth, setViewportWidth] = useState(100);
	const [leftbarWidth, setLeftbarWidth] = useState(0);
	const [leftbarOpen, setLeftbarOpen] = useState(false);
	const [leftbarOpened, setLeftbarOpened] = useState(false);
	const [defaultLeftbarWidth, setDefaultLeftbarWidth] = useState(0);
	const [currentLeftbarWidth, setCurrentLeftbarWidth] = useState(0);
	const [currentDoubleBuffer, setCurrentDoubleBuffer] = useState(1);
	const [loadedPages, setLoadedPages] = useState([page]);
	const [loadingPages, setLoadingPages] = useState([page]);
	const [loadingComplete, setLoadingComplete] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [lastElement, setLastElement] = useState(null);
	const [fileBuffer1, setFileBuffer1] = useState(null);
	const [fileBuffer2, setFileBuffer2] = useState(null);

	const stageHeight = defaultStageHidden
		? 0
		: isFullscreen
			? viewportHeight - navbarHeight
			: (viewportHeight - navbarHeight) * 0.75;
	let navbarTimer = null;
	/**
	 * @description Resets the left bar's width to zero, closes its open state, and marks
	 * it as opened in memory for future reference, effectively closing a previously
	 * expanded left bar section.
	 */
	const closeBigInfo = () => {
		setCurrentLeftbarWidth(0);
		setLeftbarOpen(false);
		setLeftbarOpened(true);
	};
	/**
	 * @description Returns a closure that sets the left bar to open state and resets its
	 * width when invoked. It also triggers an item click event with a detail value of
	 * 2, likely simulating a slide transition. The returned function is memoized for reuse.
	 *
	 * @param {number} i - Referenced by itemClick(i).
	 *
	 * @returns {Function} A higher-order function that wraps an anonymous function
	 * containing three statements: setting two state variables and invoking itemClick
	 * with specific parameters and props.
	 */
	const goFullscreen = (i) => {
		return () => {
			setLeftbarOpened(true);
			setCurrentLeftbarWidth(0);
			itemClick(i, 'slide')({ detail: 2 });
		};
	};
	const [bigInfo, setBigInfo] = useState(
		initialSelection && typeof renderBigInfo === 'function'
			? renderBigInfo(initialSelection, closeBigInfo, goFullscreen)
			: null,
	);
	const doLoadingTimer = useCallback(() => {
		if (loadedPages.length === loadingPages.length) {
			setLoadingComplete(true);
			console.log('LOADING complete');
		} else {
			setTimeout(() => {
				// Delays execution.
				doLoadingTimer();
			}, 2000);
		}
	}, [loadedPages, loadingPages]);
	useEffect(() => {
		// Sets a timer with a timeout.
		setTimeout(() => {
			// Executes another function after a delay.
			doLoadingTimer();
		}, 3000);
	}, []);

	if (!loadedPages.includes(page)) setLoadedPages([...loadedPages, page]);
	const currentlyLoading = !(loadedPages.length === loadingPages.length);

	const containerDiv = useRef();
	const portalDiv = useRef();
	const loadMoreRef = useRef();
	const loadPrevRef = useRef();
	const doubleBuffer1 = useRef();
	const doubleBuffer2 = useRef();
	const fileDoubleBuffer1 = useRef();
	const fileDoubleBuffer2 = useRef();
	const sliderRef = useRef();
	const leftBar = useRef();
	let items, itemHTML;
	let useThumbSize = thumbSize;

	useEffect(() => {
		// Reacts to changes in pagination.
		if (page === 0) setFirstPageLoaded(true);
		if (page > initialPage && page > rightPageCursor) {
			setRightPageCursor(page);
		} else if (page < initialPage && page < leftPageCursor) {
			setLeftPageCursor(page);
		}
		if (sliderRef.current && selectedItem?.id && !loadingComplete) {
			sliderRef.current
				.querySelector('li[data-id="' + selectedItem.id + '"]')
				?.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
		}
	}, [page, rightPageCursor, leftPageCursor]);

	switch (displayType) {
		case 'list':
			itemHTML = listItemHTML;
			break;
		case 'details':
			itemHTML = detailsItemHTML;
			break;
		case 'thumbnails':
			itemHTML = thumbnailsItemHTML;
			break;
		case 'slide':
			itemHTML = slideItemHTML;
			useThumbSize = stageHeight === 0 ? viewportHeight - navbarHeight : (viewportHeight - navbarHeight) * 0.25;
			break;
	}
	/**
	 * @description Sets up a timer to hide the navbar after 5 seconds when the user's
	 * mouse is not near it, and adjusts its height based on whether it should be hidden
	 * or visible.
	 *
	 * @param {Event} e - An event object.
	 */
	const mouseMove = (e) => {
		if (e.clientY < 60) {
			if (displayType !== 'slide') {
				clearTimeout(navbarTimer);

				navbarTimer = setTimeout(hideNavbar, 5000);
			}
			setNavbarHeight(defaultNavbarHidden ? 0 : 60);
		}
	};
	/**
	 * @description Updates the navigation bar's height based on its default hidden state
	 * and resets a timer to hide the navbar after a delay, depending on the display type
	 * not being 'slide'.
	 */
	const scroll = () => {
		if (displayType !== 'slide') {
			clearTimeout(navbarTimer);

			navbarTimer = setTimeout(hideNavbar, 5000);
		}
		setNavbarHeight(defaultNavbarHidden ? 0 : 60);
	};
	/**
	 * @description Generates an event handler for item clicks within a slider. It updates
	 * the selected item, display type, and left bar state based on click details and
	 * user interactions. It also triggers scrolling, animations, and callback functions
	 * as needed.
	 *
	 * @param {object} i - Required for function execution.
	 *
	 * @param {null} newDisplayType - Optional.
	 *
	 * @returns {(Event) => void} A callback function that handles item clicks.
	 */
	const itemClick = (i, newDisplayType = null) => {
		return (e) => {
			if (!newDisplayType) newDisplayType = displayType;
			if (!i) return;

			if (selectedItem !== i || e.detail > 1 || e.detail < 1) {
				if (selectedItem) {
					sliderRef.current
						.querySelector('li[data-id="' + selectedItem.id + '"]')
						?.classList?.remove(styles['mediaslide-item-selected']);
				}
				setSelectedItem(i);
				if (typeof selectionChange === 'function') {
					selectionChange(i);
				}
				setBigInfo(renderBigInfo(i, closeBigInfo, goFullscreen));

				let dt = newDisplayType;
				if (displayType !== 'slide' && e.detail > 1) {
					dt = 'slide';
					setDisplayType('slide');
					//setLeftbarWidth(0);
					setLeftbarOpened(true);
					setCurrentLeftbarWidth(0);
				}
				if (dt !== 'slide' && !leftbarOpen && e.detail > 0) {
					setLeftbarWidth(isPortrait() ? viewportWidth : defaultLeftbarWidth || 300);
					setCurrentLeftbarWidth(isPortrait() ? viewportWidth : defaultLeftbarWidth || 300);
					setLeftbarOpen(true);
					setLeftbarOpened(false);
				} else if (dt === 'slide' && leftbarOpen && e.detail > 0) {
					//setLeftbarWidth(0);

					setLeftbarOpened(true);
				}
				sliderRef.current
					.querySelector('li[data-id="' + i.id + '"]')
					?.classList?.add(styles['mediaslide-item-selected']);
				if (dt === 'slide' || e.detail < 1) {
					setTimeout(() => {
						// Scrolls an element into view after a delay.
						sliderRef.current
							.querySelector('li[data-id="' + i.id + '"]')
							?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
					}, 500);
				}
				if (dt === 'slide' || e.detail > 1) {
					flipDoubleBuffer(i, dt);
				}
			}
		};
	};

	/**
	 * @description Flips between two double buffers, rendering a new image or file while
	 * maintaining a smooth visual transition. It handles different types of media (images
	 * and HTML files) and uses message passing for asynchronous handling when rendering
	 * HTML files.
	 *
	 * @param {any} i - Used to reference an image or object being processed.
	 *
	 * @param {number} dt - Likely representing time, possibly delta time.
	 */
	const flipDoubleBuffer = (i, dt) => {
		if (currentDoubleBuffer === 1) {
			/**
			 * @description Sets up a double buffering system by manipulating opacity and removing
			 * event listeners. It increases the opacity of one buffer, decreases the opacity of
			 * others, and switches to another buffer after an image has loaded.
			 */
			const l = () => {
				if (doubleBuffer1.current) doubleBuffer1.current.style.opacity = 1;
				if (doubleBuffer2.current) doubleBuffer2.current.style.opacity = 0;
				if (fileDoubleBuffer2.current) fileDoubleBuffer2.current.style.opacity = 0;
				if (fileDoubleBuffer1.current) fileDoubleBuffer1.current.style.opacity = 0;
				setCurrentDoubleBuffer(2);
				if (doubleBuffer1.current) doubleBuffer1.current.removeEventListener('load', l);
			};

			/**
			 * @description Sends a message to all windows that it is ready for slides. It uses
			 * the `window.postMessage` method, which allows communication between different
			 * origins, and specifies that the message should be sent to all windows (`'*'`) with
			 * the key "request" set to 'slideReady'.
			 */
			const r = () => {
				window.postMessage({ request: 'slideReady' }, '*');
			};
			if (
				i?.metadata?.files &&
				i.metadata.files.length > 0 &&
				i.metadata.files[0]?.mediaType?.substring(0, 9) === 'text/html'
			) {
				/**
				 * @description Processes a message event triggered by a web page or frame, specifically
				 * when it receives the message `'slideReady'`. It updates opacity and filter styles
				 * for certain elements based on the presence of specific files, then removes itself
				 * as an event listener.
				 *
				 * @param {Event} e - Related to event handling.
				 */
				const messageHandler = (e) => {
					if (e.data.request === 'slideReady') {
						if (fileDoubleBuffer1.current) fileDoubleBuffer1.current.style.opacity = 1;
						if (fileDoubleBuffer2.current) fileDoubleBuffer2.current.style.opacity = 0;
						if (doubleBuffer2.current) doubleBuffer2.current.style.opacity = 0;
						if (doubleBuffer1.current) doubleBuffer1.current.style.opacity = 0;
						setCurrentDoubleBuffer(2);
						fileDoubleBuffer2.current.style.filter = 'none';
						window.removeEventListener('message', messageHandler);
					}
				};
				if (fileDoubleBuffer2.current) {
					fileDoubleBuffer2.current.style.filter = 'blur(7px) brightness(70%)';
					fileDoubleBuffer2.current.style.zIndex = 1;
				}
				if (fileDoubleBuffer1) fileDoubleBuffer1.current.style.zIndex = 2;
				window.addEventListener('message', messageHandler);
				renderFile(i, r, '100%', stageHeight, mouseMove).then((buf) => {
					// Sets a buffer.
					setFileBuffer1(buf);
				});
			} else {
				if (doubleBuffer1.current) {
					doubleBuffer1.current.addEventListener('load', l);
					doubleBuffer1.current.src = i.full;
				}
			}
		} else {
			/**
			 * @description Updates the opacity and removes an event listener for a double buffer
			 * system. It sets the first double buffer to visible, makes other buffers invisible,
			 * removes the load event listener from the second double buffer, and calls
			 * setCurrentDoubleBuffer with argument 1.
			 */
			const l = () => {
				if (doubleBuffer2.current) doubleBuffer2.current.style.opacity = 1;
				if (doubleBuffer1.current) doubleBuffer1.current.style.opacity = 0;
				if (fileDoubleBuffer1.current) fileDoubleBuffer1.current.style.opacity = 0;
				if (fileDoubleBuffer2.current) fileDoubleBuffer2.current.style.opacity = 0;
				setCurrentDoubleBuffer(1);
				if (doubleBuffer2.current) doubleBuffer2.current.removeEventListener('load', l);
			};

			/**
			 * @description Posts a message to all windows with the same origin, sending a `request`
			 * named `'slideReady'`. This enables communication between different frames or windows
			 * using the postMessage API. The `*` target specifies that the message should be
			 * sent to all accessible browsing contexts.
			 */
			const r = () => {
				window.postMessage({ request: 'slideReady' }, '*');
			};
			if (
				i?.metadata?.files &&
				i.metadata.files.length > 0 &&
				i.metadata.files[0]?.mediaType?.substring(0, 9) === 'text/html'
			) {
				/**
				 * @description Responds to a specific message event, handles opacity changes for
				 * multiple DOM elements, sets the current double buffer index, and removes itself
				 * as an event listener after execution. It is likely used in a web application that
				 * interacts with another process or frame.
				 *
				 * @param {Event} e - Related to message events.
				 */
				const messageHandler = (e) => {
					if (e.data.request === 'slideReady') {
						if (fileDoubleBuffer2.current) fileDoubleBuffer2.current.style.opacity = 1;
						if (fileDoubleBuffer1.current) fileDoubleBuffer1.current.style.opacity = 0;
						if (doubleBuffer1.current) doubleBuffer1.current.style.opacity = 0;
						if (doubleBuffer2.current) doubleBuffer2.current.style.opacity = 0;
						setCurrentDoubleBuffer(1);
						if (fileDoubleBuffer1.current) fileDoubleBuffer1.current.style.filter = 'none';
						window.removeEventListener('message', messageHandler);
					}
				};
				if (fileDoubleBuffer1.current) fileDoubleBuffer1.current.style.filter = 'blur(7px) brightness(70%)';
				if (fileDoubleBuffer2.current) fileDoubleBuffer2.current.style.zIndex = 2;
				if (fileDoubleBuffer1.current) fileDoubleBuffer1.current.style.zIndex = 1;
				window.addEventListener('message', messageHandler);
				renderFile(i, r, '100%', stageHeight, mouseMove).then((buf) => {
					// Assigns a buffer to file buffer 2.
					setFileBuffer2(buf);
				});
			} else {
				if (doubleBuffer2.current) {
					doubleBuffer2.current.addEventListener('load', l);
					doubleBuffer2.current.src = i.full;
				}
			}
		}
	};
	if (gallery) {
		if (gallery.length < 1) {
			items = <h1>Not found</h1>;
		} else {
			let lElement, ldElement;
			if (page < totalPages) {
				ldElement = (
					<div
						style={{
							paddingLeft: thumbSpacing,
							paddingRight: thumbSpacing,
							paddingBottom: thumbSpacing,
						}}
						ref={loadMoreRef}
					>
						{loadingIndicator}
					</div>
				);

				lElement = (
					<li
						style={{
							paddingLeft: thumbSpacing,
							paddingRight: thumbSpacing,
							paddingBottom: thumbSpacing,
						}}
						ref={loadMoreRef}
					>
						{loadingIndicator}
					</li>
				);
			}
			let fElement, fdElement;
			if (!firstPageLoaded) {
				fdElement = (
					<caption
						style={{
							paddingLeft: thumbSpacing,
							paddingRight: thumbSpacing,
							paddingBottom: thumbSpacing,
						}}
						ref={loadPrevRef}
					>
						{loadingIndicator}
					</caption>
				);

				fElement = (
					<li
						style={{
							paddingLeft: thumbSpacing,
							paddingRight: thumbSpacing,
							paddingBottom: thumbSpacing,
						}}
						ref={loadPrevRef}
					>
						{loadingIndicator}
					</li>
				);
			}
			if (displayType === 'details') {
				items = (
					<>
						{fdElement}
						<table
							ref={sliderRef}
							style={{ tableLayout: 'fixed' }}
							className={styles['mediaslide-' + displayType + '-ul']}
						>
							<tbody>{gallery.map(itemHTML(itemClick, useThumbSize, thumbSpacing))}</tbody>
						</table>
						{ldElement}
					</>
				);
			} else {
				items = (
					<ul ref={sliderRef} className={styles['mediaslide-' + displayType + '-ul']}>
						{fElement}
						{gallery.map(itemHTML(itemClick, useThumbSize, thumbSpacing))}
						{lElement}
					</ul>
				);
			}
		}
	} else {
		items = <h1>{loadingIndicator}</h1>;
	}
	const addLoading = useCallback(
		(p) => {
			setLoadingPages([...loadingPages, p]);
		},
		[loadingPages],
	);

	const loadingContains = useCallback(
		(p) => {
			return loadingPages.includes(p);
		},
		[loadingPages],
	);

	const endOb = useCallback(() => {
		if (rightPageCursor < totalPages && !loadingContains(rightPageCursor + 1)) {
			onLoadMoreData({ page: rightPageCursor }, 1);
			addLoading(rightPageCursor + 1);
		}
	}, [rightPageCursor, totalPages, gallery]);
	const startOb = useCallback(() => {
		if (!firstPageLoaded && leftPageCursor !== 0 && !loadingContains(leftPageCursor - 1)) {
			onLoadMoreData({ page: leftPageCursor }, -1);
			addLoading(leftPageCursor - 1);
		}
	}, [leftPageCursor, firstPageLoaded, loadingPages]);

	useEffect(() => {
		// Sets up and manages Intersection Observers to handle page scrolling and loading
		// more data.
		const endObserver = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				endOb();
			}
		});
		if (loadMoreRef.current) {
			endObserver.observe(loadMoreRef.current);
		}
		const startObserver = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				startOb();
			}
		});
		if (loadPrevRef.current) {
			startObserver.observe(loadPrevRef.current);
		}
		return () => {
			endObserver.disconnect();
			startObserver.disconnect();
		};
	}, [loadMoreRef.current, loadPrevRef.current, page, leftPageCursor, rightPageCursor, displayType]);
	/**
	 * @description Sets the height of a navbar to 0, effectively hiding it on the page.
	 */
	const hideNavbar = () => {
		setNavbarHeight(0);
	};

	useEffect(() => {
		// Handles various event listeners and timer.
		navbarTimer = setTimeout(hideNavbar, 5000);
		containerDiv.current.addEventListener('mousemove', mouseMove, true);
		window.document.addEventListener('mousemove', mouseMove, true);
		window.document.addEventListener('touchmove', mouseMove, true);
		portalDiv.current.addEventListener('scroll', scroll, true);
		window.addEventListener('scroll', scroll, true);
		window.addEventListener('wheel', scroll, true);
		window.addEventListener('touchmove', scroll, true);
		return () => {
			if (containerDiv.current) {
				containerDiv.current.removeEventListener('mousemove', mouseMove, true);
				window.document.removeEventListener('mousemove', mouseMove, true);
				window.document.removeEventListener('touchmove', mouseMove, true);
				portalDiv.current.removeEventListener('scroll', scroll, true);
				window.removeEventListener('scroll', scroll, true);
				window.removeEventListener('wheel', scroll, true);
				window.removeEventListener('touchmove', scroll, true);
			}
			clearTimeout(navbarTimer);
		};
	}, []);
	useEffect(() => {
		// Observes and handles container div resizing.
		const resizeObserver = new ResizeObserver((event) => {
			setViewportWidth(event[0].contentBoxSize[0].inlineSize);
			setViewportHeight(event[0].contentBoxSize[0].blockSize);
			let leftbarW = event[0].contentBoxSize[0].inlineSize * leftbarWidthRatio;
			if (leftbarW === 0) return;
			if (leftbarW > 600) leftbarW = 600;
			if (leftbarW < 300) leftbarW = 300;
			setDefaultLeftbarWidth(isPortrait() ? event[0].contentBoxSize[0].inlineSize : leftbarW);
			setLeftbarWidth(isPortrait() ? event[0].contentBoxSize[0].inlineSize : leftbarW);
			if (!selectedItem && initialSelection) {
				//itemClick(initialSelection,'slide')({detail:1})
				setLeftbarWidth(isPortrait() ? event[0].contentBoxSize[0].inlineSize : leftbarW || 300);
				setCurrentLeftbarWidth(isPortrait() ? event[0].contentBoxSize[0].inlineSize : leftbarW || 300);
				setLeftbarOpen(true);
				setLeftbarOpened(false);
				itemClick(initialSelection, 'slide')({ detail: -1 });
			}
		});
		resizeObserver.observe(containerDiv.current);

		return () => {
			resizeObserver.disconnect();
		};
	}, []);
	useEffect(() => {
		// Adds and removes an event listener for keydown events on the window object.
		const listener = keyDown(sliderRef, displayType);
		window.addEventListener('keydown', listener);
		return () => {
			window.removeEventListener('keydown', listener);
		};
	}, [displayType]);

	/**
	 * @description Determines whether the device's screen orientation is portrait or not
	 * by comparing the inner height and width of the window. It returns a boolean value
	 * indicating if the inner height is greater than the inner width.
	 *
	 * @returns {boolean} `true` if the device is in portrait orientation and `false` otherwise.
	 */
	const isPortrait = () => {
		return window.innerHeight > window.innerWidth;
	};

	/**
	 * @description Updates display type and resets related state variables based on user
	 * input. It handles layout changes, resets file buffers, and triggers item click
	 * events with a delay to accommodate animation or other visual effects.
	 *
	 * @param {Event} e - Used to capture event properties.
	 */
	const displayTypeChange = (e) => {
		setDisplayType(e.target.value);
		if ((leftbarOpen || leftbarWidth > 0) && isPortrait()) {
			setLeftbarOpen(false);
			setLeftbarWidth(0);
		}
		if (e.target.value !== 'slide') {
			setFileBuffer1('');
			setFileBuffer2('');
			let delay = 10;
			let clickNum = 0;
			if (leftbarOpen && leftbarWidth === 0) {
				delay = 400;
				clickNum = 0;

				setBigInfo('');
				if (!isPortrait()) {
					setLeftbarWidth(defaultLeftbarWidth);
				} else {
					setLeftbarWidth(0);
				}
			} else if (leftbarOpen) {
				if (!isPortrait()) {
					setCurrentLeftbarWidth(defaultLeftbarWidth);
					setLeftbarWidth(defaultLeftbarWidth);
				} else {
					setCurrentLeftbarWidth(0);
					setLeftbarWidth(0);
				}
			}
			setTimeout(() => {
				// Delays execution.
				itemClick(selectedItem, e.target.value)({ detail: clickNum });
			}, delay);
		} else {
			setCurrentLeftbarWidth(0);
			setTimeout(() => {
				// Delays an action by a specified time period.
				itemClick(selectedItem, e.target.value)({ detail: 0 });
			}, 10);
		}
	};
	/**
	 * @description Sets a new thumbnail size and, if not already displaying thumbnails,
	 * switches to a display type that shows thumbnails.
	 *
	 * @param {number} s - Related to thumbnail size.
	 */
	const thumbSizeSlide = (s) => {
		setThumbSize(s);
		if (displayType !== 'thumbnails') {
			setDisplayType('thumbnails');
		}
	};
	/**
	 * @description Sets thumb spacing to a specified value and, if the display type is
	 * not 'thumbnails', it switches the display type to 'thumbnails'.
	 *
	 * @param {number} s - Used for spacing.
	 */
	const thumbSpacingSlide = (s) => {
		setThumbSpacing(s);
		if (displayType !== 'thumbnails') {
			setDisplayType('thumbnails');
		}
	};
	/**
	 * @description Toggles the display type between 'slide' and any other value, and
	 * concurrently toggles the full screen status from true to false or vice versa if
	 * it is currently set.
	 */
	const toggleFullscreen = () => {
		if (displayType !== 'slide') {
			setDisplayType('slide');
		}
		if (isFullscreen) {
			setIsFullscreen(false);
		} else {
			setIsFullscreen(true);
		}
	};
	/**
	 * @description Handles scrolling behavior for a slide or list display type on a touch
	 * device, scrolling the container when the user interacts with it and adjusting the
	 * scroll position based on the scroll amount and direction.
	 *
	 * @param {WheelEvent} e - Associated with the wheel event.
	 */
	const slideScroll = (e) => {
		if (displayType !== 'slide' && displayType !== 'list') return;
		scroll();
		const container = portalDiv.current;
		const scrollAmount = e.deltaY / 1.5;
		container.scrollTo({
			top: 0,
			left: container.scrollLeft + scrollAmount,
			behavior: 'instant',
		});
	};
	/**
	 * @description Simulates a click on the previous sibling element of an element with
	 * a class name matching 'mediaslide-item-selected'. It does so by querying the current
	 * DOM node referenced by `sRef.current` for such an element and invoking its `click()`
	 * method if found.
	 *
	 * @param {React.RefObject<HTMLDivElement>} sRef - Used to access an HTML element.
	 *
	 * @param {string} displayType - Used to identify the selected item.
	 */
	const previous = (sRef, displayType) => {
		sRef.current.querySelector('.' + styles['mediaslide-item-selected'])?.previousElementSibling.click();
	};
	/**
	 * @description Navigates to the next media slide by querying the current DOM element,
	 * finding the selected item class, and programmatically clicking its next sibling
	 * element if it exists.
	 *
	 * @param {React.RefObject<HTMLElement>} sRef - Used to select an HTML element.
	 *
	 * @param {string} displayType - Unused.
	 */
	const next = (sRef, displayType) => {
		sRef.current.querySelector('.' + styles['mediaslide-item-selected'])?.nextElementSibling.click();
	};
	/**
	 * @description Returns a new function that listens for arrow key presses and executes
	 * either `previous` or `next` functions based on the pressed key, passing the `sRef`
	 * reference as an argument.
	 *
	 * @param {number} sRef - Likely an array index reference.
	 *
	 * @returns {Function} An event listener that is triggered when a specific key (e.g.,
	 * ArrowLeft, ArrowRight) is pressed on a keyboard.
	 */
	const keyDown = (sRef) => {
		return (e) => {
			switch (e.key) {
				case 'ArrowLeft':
					previous(sRef);
					break;
				case 'ArrowRight':
					next(sRef);
					break;
			}
		};
	};

	return (
		<div className={styles['mediaslide-container']} ref={containerDiv}>
			<div
				className={
					styles['mediaslide-leftbar'] + (leftbarOpened ? ' ' + styles['mediaslide-leftbar-opened'] : '')
				}
				ref={leftBar}
				style={{
					height: leftbarWidth == 0 ? 0 : viewportHeight,
					width: leftbarWidth,
					left: -(leftbarWidth - currentLeftbarWidth),
				}}
			>
				<div style={{ position: 'relative', top: navbarHeight }}>{bigInfo}</div>
			</div>
			<div
				className={styles.mediaslide + ' ' + styles['mediaslide-' + displayType]}
				style={{ height: viewportHeight }}
			>
				<nav
					className={styles['mediaslide-nav']}
					style={{
						height: navbarHeight,
						visibility: navbarHeight === 0 ? 'hidden' : 'visible',
						transform: viewportWidth < 512 ? 'scale(0.5) translateY(-25%)' : 'none',
					}}
				>
					<label className={styles['mediaslide-nav-displaytype']}>
						<input
							className={styles['mediaslide-navbar-radio']}
							type="radio"
							name="displayType"
							value="list"
							onChange={displayTypeChange}
							checked={displayType === 'list'}
						/>
						List
					</label>
					<label className={styles['mediaslide-nav-displaytype']}>
						<input
							className={styles['mediaslide-navbar-radio']}
							type="radio"
							name="displayType"
							value="details"
							onChange={displayTypeChange}
							checked={displayType === 'details'}
						/>
						Details
					</label>
					<label className={styles['mediaslide-nav-displaytype']}>
						<input
							className={styles['mediaslide-navbar-radio']}
							type="radio"
							name="displayType"
							value="thumbnails"
							onChange={displayTypeChange}
							checked={displayType === 'thumbnails'}
						/>
						Thumbnails
						<br />
						<div
							className={styles['mediaslide-slider-opacity']}
							style={{ opacity: displayType === 'thumbnails' ? '1' : '0.2' }}
						>
							<Slider
								min={100}
								max={700}
								value={thumbSize}
								onChange={thumbSizeSlide}
								className={styles['mediaslide-size-slider']}
								thumbClassName={styles['mediaslide-size-slider-thumb']}
								trackClassName={styles['mediaslide-size-slider-track']}
							/>
							<Slider
								min={0}
								max={100}
								value={thumbSpacing}
								onChange={thumbSpacingSlide}
								className={styles['mediaslide-spacing-slider']}
								thumbClassName={styles['mediaslide-spacing-slider-thumb']}
								trackClassName={styles['mediaslide-spacing-slider-track']}
							/>
						</div>
					</label>
					<label className={styles['mediaslide-nav-displaytype']}>
						<input
							className={styles['mediaslide-navbar-radio']}
							type="radio"
							name="displayType"
							value="slide"
							onChange={displayTypeChange}
							checked={displayType === 'slide'}
						/>
						Slide
						<br />
						<div
							className={styles['mediaslide-transport-opacity']}
							style={{ opacity: displayType === 'slide' ? '1' : '0.2' }}
						>
							<button
								onClick={toggleFullscreen}
								className={
									styles[
										isFullscreen
											? 'mediaslide-transport-fullscreen-active'
											: 'mediaslide-transport-fullscreen'
									]
								}
							>
								&nbsp;
							</button>
							{/*
                            
							<button className={styles['mediaslide-transport-start']}>⏮</button>
							<button className={styles['mediaslide-transport-rewind']}>⏪︎</button>
							<button className={styles['mediaslide-transport-stop']}>⏹︎</button>
							<button className={styles['mediaslide-transport-play']}>⏵︎</button>
							<button className={styles['mediaslide-transport-forward']}>⏩︎</button>
							<button className={styles['mediaslide-transport-end']}>⏭</button>
                            */}
						</div>
					</label>
				</nav>
				<section
					className={styles['mediaslide-slide-stage']}
					style={{
						height: displayType === 'slide' ? stageHeight : 0,
						opacity: displayType === 'slide' ? '1' : '0',
					}}
				>
					<div className={styles['mediaslide-double-buffer-container']} style={{ opacity: '1' }}>
						<img
							alt="Media display window"
							className={styles['mediaslide-double-buffer']}
							style={{ opacity: 0 }}
							src=""
							ref={doubleBuffer1}
							height={displayType === 'slide' ? stageHeight : 0}
						/>
						<img
							alt="Media display window"
							className={styles['mediaslide-double-buffer']}
							style={{ opacity: 0 }}
							src=""
							ref={doubleBuffer2}
							height={displayType === 'slide' ? stageHeight : 0}
						/>
						<div
							className={styles['mediaslide-double-buffer']}
							style={{
								opacity: 0,
								height: displayType === 'slide' ? stageHeight : 0,
								width: viewportWidth,
							}}
							src=""
							ref={fileDoubleBuffer1}
						>
							{fileBuffer1}
						</div>
						<div
							className={styles['mediaslide-double-buffer']}
							style={{
								opacity: 0,
								height: displayType === 'slide' ? stageHeight : 0,
								width: viewportWidth,
							}}
							src=""
							ref={fileDoubleBuffer2}
						>
							{fileBuffer2}
						</div>
					</div>
				</section>

				<section
					ref={portalDiv}
					className={styles['mediaslide-portal']}
					style={{
						width: viewportWidth - currentLeftbarWidth,
						left: currentLeftbarWidth,
						height:
							displayType === 'slide' && stageHeight !== 0
								? (viewportHeight - navbarHeight) * 0.25
								: viewportHeight - navbarHeight,
					}}
					onWheel={slideScroll}
				>
					{items}
				</section>
			</div>
		</div>
	);
};
MediaSlide.propTypes = {
	gallery: PropTypes.array.isRequired,
	loading: PropTypes.bool.isRequired,
	defaultDisplayType: PropTypes.string,
	onLoadMoreData: PropTypes.func.isRequired,
	pagination: PropTypes.object.isRequired,
	renderFile: PropTypes.func.isRequired,
	renderBigInfo: PropTypes.func.isRequired,
	loadingIndicator: PropTypes.object,
};
export default MediaSlide;
