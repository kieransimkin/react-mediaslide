import PropTypes from 'prop-types';
import { useEffect, useRef, useState, useCallback } from 'react';
import { version } from '../package.json';
import styles from './MediaSlide.module.css';
import Slider from 'react-slider';
import * as React from 'react';

/**
 * @description Renders a media gallery with customizable display types (list, details,
 * thumbnails, slide), and features such as pagination, loading indicators, and
 * keyboard navigation controls. It also includes support for slideshows, double
 * buffering, and file rendering.
 *
 * @param {object} props - Passed from parent component to child component.
 *
 * @returns {JSX.Element} A React component representing a media slide show with
 * various display types and interactive features.
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
	 * @description Sets the current left bar width to 0, closes the left bar by setting
	 * it to false, and indicates that the left bar has been opened before by setting it
	 * to true.
	 */
	const closeBigInfo = () => {
		setCurrentLeftbarWidth(0);
		setLeftbarOpen(false);
		setLeftbarOpened(true);
	};
	/**
	 * @description Returns an anonymous function that sets up a sequence of actions to
	 * put the application into full-screen mode when called. It opens the left bar,
	 * resets its width, and triggers an item click with specific parameters to initiate
	 * the transition to full screen.
	 *
	 * @param {number} i - Passed to the `itemClick` function.
	 *
	 * @returns {Function} An anonymous function that performs certain actions when executed.
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
				// Delays.
				doLoadingTimer();
			}, 2000);
		}
	}, [loadedPages, loadingPages]);
	useEffect(() => {
		// Simulates a delay before calling another function.
		setTimeout(() => {
			// Executes with a delay.
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
		// Executes on state changes.
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
	 * @description Triggers a countdown to hide the navbar when the mouse cursor moves
	 * down more than 60 pixels from the top of the page while displaying content other
	 * than slides. It also adjusts the navbar height accordingly.
	 *
	 * @param {Event} e - An event object that represents the mouse movement action.
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
	 * @description Clears a timer if the display type is not 'slide', then sets a new
	 * timer to hide the navbar after 5 seconds. It also updates the navbar height based
	 * on whether it should be hidden or displayed by default.
	 */
	const scroll = () => {
		if (displayType !== 'slide') {
			clearTimeout(navbarTimer);

			navbarTimer = setTimeout(hideNavbar, 5000);
		}
		setNavbarHeight(defaultNavbarHidden ? 0 : 60);
	};
	/**
	 * @description Returns an event handler that is triggered when a list item is clicked.
	 * It updates the selected item, changes the display type if necessary, and scrolls
	 * to or flips the new item based on the click details.
	 *
	 * @param {number} i - Related to an item's ID or index.
	 *
	 * @param {null} newDisplayType - Used to specify display mode.
	 *
	 * @returns {Function} A callback function that handles click events on items within
	 * the slider.
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
	 * @description Implements a double buffering system for rendering images, with two
	 * buffers (doubleBuffer1 and doubleBuffer2) that alternate to display an image without
	 * flicker. It handles HTML files differently, using a message handler for slide ready
	 * events.
	 *
	 * @param {object} i - An item being processed.
	 *
	 * @param {number} dt - Used for time calculations.
	 */
	const flipDoubleBuffer = (i, dt) => {
		if (currentDoubleBuffer === 1) {
			/**
			 * @description Executes a series of instructions when an image loads. It sets opacity
			 * to 1 for the current buffer, and opacity to 0 for several other buffers, and then
			 * removes the event listener from itself after setting the next double buffer as the
			 * current one.
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
			 * @description Sends a message to all windows, indicating that slides are ready for
			 * use. The message includes a key-value pair with a request type of 'slideReady'.
			 * It utilizes the `window.postMessage()` method, specifying '*` as the targetOrigin
			 * to broadcast the message across all domains.
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
				 * @description Processes a message received from an external source. It handles two
				 * cases:
				 *
				 * 1/ If the message indicates 'slideReady' status, it updates the opacity and filter
				 * styles of several DOM elements.
				 * 2/ It also removes itself as an event listener after processing the message.
				 *
				 * @param {Event} e - Used to handle messages from other contexts or windows.
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
					// Handles a promise result, updating a buffer variable with the result.
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
			 * @description Handles the transition between two double buffers by adjusting their
			 * opacity, removing event listeners, and updating the current double buffer index
			 * after a load event is triggered on one of the buffers.
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
			 * @description Sends a message to all windows, indicating that slides are ready, by
			 * calling the `window.postMessage` method with an object containing the request
			 * 'slideReady' and setting the target origin to '*' using '*'.
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
				 * @description Receives messages from another source, specifically checking for a
				 * request to confirm that a slide is ready. Upon receiving such a message, it adjusts
				 * the opacity and filter styles of various DOM elements, indicating that one double
				 * buffer has been replaced by another.
				 *
				 * @param {Event} e - Related to an event dispatched by the window's message listener.
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
					// Sets file buffer 2.
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
		// Observes DOM elements for intersection with viewport.
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
	 * @description Sets the height of the navbar to 0, effectively hiding it from view.
	 * This is done through the call to the `setNavbarHeight` function, which updates the
	 * navbar's height value.
	 */
	const hideNavbar = () => {
		setNavbarHeight(0);
	};

	useEffect(() => {
		// Sets up and cleans up event listeners.
		navbarTimer = setTimeout(hideNavbar, 5000);
		containerDiv.current.addEventListener('mousemove', mouseMove, true);
		window.document.addEventListener('mousemove', mouseMove, true);
		portalDiv.current.addEventListener('scroll', scroll, true);
		window.addEventListener('scroll', scroll, true);
		window.addEventListener('wheel', scroll, true);
		return () => {
			if (containerDiv.current) {
				containerDiv.current.removeEventListener('mousemove', mouseMove, true);
				window.document.removeEventListener('mousemove', mouseMove, true);
				portalDiv.current.removeEventListener('scroll', scroll, true);
				window.removeEventListener('scroll', scroll, true);
				window.removeEventListener('wheel', scroll, true);
			}
			clearTimeout(navbarTimer);
		};
	}, []);
	useEffect(() => {
		// Sets up an event listener for container size changes.
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
		// Listens for keydown events.
		const listener = keyDown(sliderRef, displayType);
		window.addEventListener('keydown', listener);
		return () => {
			window.removeEventListener('keydown', listener);
		};
	}, [displayType]);

	/**
	 * @description Determines whether the current browser window's height is greater
	 * than its width, indicating a portrait-oriented display. It returns true if the
	 * condition is met and false otherwise.
	 *
	 * @returns {boolean} True if the device's screen height exceeds its width and false
	 * otherwise.
	 */
	const isPortrait = () => {
		return window.innerHeight > window.innerWidth;
	};

	/**
	 * @description Handles changes to a display type setting based on user input, updating
	 * related state variables and triggering item click events with delayed timing
	 * according to specific conditions.
	 *
	 * @param {object} e - An event object.
	 */
	const displayTypeChange = (e) => {
		setDisplayType(e.target.value);
		if (leftbarOpen && isPortrait()) {
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
				setLeftbarWidth(defaultLeftbarWidth);
			} else if (leftbarOpen) {
				setCurrentLeftbarWidth(defaultLeftbarWidth);
				setLeftbarWidth(defaultLeftbarWidth);
			}
			setTimeout(() => {
				// Calls a method after a delay.
				itemClick(selectedItem, e.target.value)({ detail: clickNum });
			}, delay);
		} else {
			setCurrentLeftbarWidth(0);
			setTimeout(() => {
				// Delays execution by 10 milliseconds.
				itemClick(selectedItem, e.target.value)({ detail: 0 });
			}, 10);
		}
	};
	/**
	 * @description Updates a thumb size and displays thumbnails if not already being
	 * displayed, by calling two separate functions: `setThumbSize` to update the thumb
	 * size and `setDisplayType` to switch display type to thumbnails.
	 *
	 * @param {number} s - Intended to represent thumb size setting.
	 */
	const thumbSizeSlide = (s) => {
		setThumbSize(s);
		if (displayType !== 'thumbnails') {
			setDisplayType('thumbnails');
		}
	};
	/**
	 * @description Sets thumb spacing and, if the display type is not 'thumbnails', it
	 * switches to displaying thumbnails. This implies a slideshow-like behavior where
	 * switching display type changes visual layout to accommodate thumbnail mode.
	 *
	 * @param {number} s - Thumb spacing value to be set.
	 */
	const thumbSpacingSlide = (s) => {
		setThumbSpacing(s);
		if (displayType !== 'thumbnails') {
			setDisplayType('thumbnails');
		}
	};
	/**
	 * @description Changes the display type to 'slide' if it is not already set, and
	 * toggles the fullscreen status between true and false based on its current state.
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
	 * @description Handles scrolling behavior when a touchpad or mouse wheel is used to
	 * navigate through a list or slide content. It adjusts the scroll position and speed
	 * based on user input, ensuring smooth navigation within the container element.
	 *
	 * @param {WheelEvent} e - Related to mouse wheel events.
	 */
	const slideScroll = (e) => {
		if (displayType !== 'slide' && displayType !== 'list') return;
		const container = portalDiv.current;
		const scrollAmount = e.deltaY / 1.5;
		container.scrollTo({
			top: 0,
			left: container.scrollLeft + scrollAmount,
			behavior: 'instant',
		});
	};
	/**
	 * @description Selects and clicks the previous sibling element of an element with a
	 * specific class within an object referenced by `sRef.current`, which is assumed to
	 * contain HTML elements.
	 *
	 * @param {React.RefObject<HTMLElement>} sRef - Intended to reference a DOM element.
	 *
	 * @param {string} displayType - Unused.
	 */
	const previous = (sRef, displayType) => {
		sRef.current.querySelector('.' + styles['mediaslide-item-selected'])?.previousElementSibling.click();
	};
	/**
	 * @description Simulates a click on the next sibling element of an element with class
	 * 'mediaslide-item-selected' within the current reference (sRef). The next sibling
	 * is selected based on document order, and it must be the immediate sibling to trigger
	 * this action.
	 *
	 * @param {React.RefObject<HTMLElement>} sRef - Used to reference an HTML element.
	 *
	 * @param {string} displayType - Unused in this code snippet.
	 */
	const next = (sRef, displayType) => {
		sRef.current.querySelector('.' + styles['mediaslide-item-selected'])?.nextElementSibling.click();
	};
	/**
	 * @description Returns an event handler for keydown events on the specified element
	 * (`sRef`). It checks if the pressed key is 'ArrowLeft' or 'ArrowRight', and calls
	 * either the `previous` or `next` function, respectively, passing the element reference
	 * as an argument.
	 *
	 * @param {object} sRef - Referred to as a 'selector'. It references or identifies
	 * an object that needs navigation.
	 *
	 * @returns {(Event) => void} A callback function that takes an event object e as
	 * argument and executes some code when certain conditions are met.
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
