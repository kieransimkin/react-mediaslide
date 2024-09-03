import PropTypes from 'prop-types';
import { useEffect, useRef, useState, useCallback } from 'react';
import { version } from '../package.json';
import styles from './MediaSlide.module.css';
import Slider from 'react-slider';
import * as React from 'react';

/**
 * @description Creates an interactive media gallery with different display types,
 * such as list, details, thumbnails, and slide. It allows users to navigate through
 * a collection of items, select one for full-screen viewing, and customize layout
 * settings like thumb size and spacing.
 *
 * @param {object} props - An object that contains various configuration options.
 *
 * @returns {JSX.Element} A virtual DOM node representing a media gallery component
 * with various display modes and interactive features.
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
	 * @description Closes a large information window by resetting left-bar dimensions,
	 * closing the left bar while opening its opened state for animation, and scheduling
	 * to hide the navigation bar after a short delay. It also adjusts the navbar height
	 * according to its default hidden state.
	 */
	const closeBigInfo = () => {
		setCurrentLeftbarWidth(0);
		setLeftbarOpen(false);
		setLeftbarOpened(true);
		clearTimeout(navbarTimer);

		navbarTimer = setTimeout(hideNavbar, 5000);

		setNavbarHeight(defaultNavbarHidden ? 0 : 60);
	};
	/**
	 * @description Returns a closure that sets left bar opened to true, resets current
	 * left bar width to zero, and triggers an item click with a detail value of 2 when
	 * called.
	 *
	 * @param {number} i - Used as an index.
	 *
	 * @returns {Function} A closure that executes the specified sequence of actions when
	 * called. The returned function is an anonymous arrow function with its own scope
	 * and variables, including setLeftbarOpened, setCurrentLeftbarWidth and itemClick.
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
		[initialSelection],
	);
	const doLoadingTimer = useCallback(() => {
		// Reloads itself after 2 seconds unless its conditions are met.
		if (loadedPages.length === loadingPages.length) {
			setLoadingComplete(true);
			console.log('LOADING complete');
		} else {
			setTimeout(() => {
				// Calls another function after 2 seconds delay.
				doLoadingTimer();
			}, 2000);
		}
	}, [loadedPages, loadingPages]);
	useEffect(() => {
		// Executes with no dependencies.
		setTimeout(() => {
			// Executes after a delay.
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
		// Updates UI state and scrolls to selected item.
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
	 * @description Tracks mouse position on the y-axis. When the cursor is below a certain
	 * threshold (y-coordinate < 60), it sets up a timer to hide the navigation bar after
	 * 5 seconds if it's not currently being displayed as a slide, and updates navbar
	 * height accordingly.
	 *
	 * @param {Event} e - Used to access event properties.
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
	 * @description Resets a timer to hide the navbar after 5 seconds if it is not set
	 * to 'slide', and updates the navbar's height based on its display state.
	 */
	const scroll = () => {
		if (displayType !== 'slide') {
			clearTimeout(navbarTimer);

			navbarTimer = setTimeout(hideNavbar, 5000);
		}
		setNavbarHeight(defaultNavbarHidden ? 0 : 60);
	};
	/**
	 * @description Returns a click handler that updates media display when an item is
	 * clicked, handling multiple clicks and changing display types accordingly. It also
	 * manages leftbar width and scroll position based on event details and current display
	 * type.
	 *
	 * @param {number | object} i - Referenced as an item identifier, typically a media
	 * content's ID.
	 *
	 * @param {null} newDisplayType - Used to determine the display mode.
	 *
	 * @returns {Function} An event handler that can be called later to perform certain
	 * actions when triggered by a click event.
	 */
	const itemClick = (i, newDisplayType = null) => {
		return (e) => {
			if (!newDisplayType) newDisplayType = displayType;
			if (!i) return;
			portalDiv.current.focus();
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
	 * @description Flips between two buffers (doubleBuffer1 and doubleBuffer2) based on
	 * the current buffer state, handling different media types (e.g., HTML files). It
	 * updates styles, removes event listeners, and sends messages to prepare for rendering
	 * the next slide.
	 *
	 * @param {object} i - An image or slide being rendered.
	 *
	 * @param {number} dt - Unused.
	 */
	const flipDoubleBuffer = (i, dt) => {
		if (currentDoubleBuffer === 1) {
			/**
			 * @description Resets the opacity of double buffers, removes the event listener from
			 * `doubleBuffer1`, and updates the current double buffer to number 2. It prepares
			 * for a new load operation by setting up the display state and cleanup.
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
			 * @description Sends a message to all iframes on the current domain, informing them
			 * that a slide is ready by posting a JSON object with the key "request" and value
			 * "slideReady" through the window.postMessage API.
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
				 * @description Handles messages received from a separate context, specifically when
				 * a slide is ready. It updates CSS styles to prepare the display and removes event
				 * listeners after completing its task.
				 *
				 * @param {Event} e - An event object representing an incoming message from another
				 * context.
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
					// Handles a buffer.
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
			 * @description Updates styles, removes an event listener, and changes the current
			 * double buffer. It sets the opacity of certain elements to 1 or 0 based on their
			 * current state. The event listener is removed from a 'load' event handler attached
			 * to an element, likely a canvas or image.
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
			 * @description Posts a message to all windows with the same origin, signaling that
			 * slides are ready for use. The message is an object with a property named "request"
			 * set to the string "slideReady".
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
				 * @description Handles an incoming message event. It checks if the request is to
				 * indicate slide readiness. If so, it sets the opacity of certain double-buffer
				 * elements and updates the current double buffer. It also removes the event listener
				 * after handling the message.
				 *
				 * @param {Event} e - Used for event handling, specifically for message events.
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
					// Sets buffer value.
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
			// Memoizes addLoading.
			setLoadingPages([...loadingPages, p]);
		},
		[loadingPages],
	);

	const loadingContains = useCallback(
		(p) => {
			// Memoizes the includes method call.
			return loadingPages.includes(p);
		},
		[loadingPages],
	);

	const endOb = useCallback(() => {
		// Loads next page data.
		if (rightPageCursor < totalPages && !loadingContains(rightPageCursor + 1)) {
			onLoadMoreData({ page: rightPageCursor }, 1);
			addLoading(rightPageCursor + 1);
		}
	}, [rightPageCursor, totalPages, gallery]);
	const startOb = useCallback(() => {
		// Loads more data if conditions are met.
		if (!firstPageLoaded && leftPageCursor !== 0 && !loadingContains(leftPageCursor - 1)) {
			onLoadMoreData({ page: leftPageCursor }, -1);
			addLoading(leftPageCursor - 1);
		}
	}, [leftPageCursor, firstPageLoaded, loadingPages]);

	useEffect(() => {
		// Initializes and cleans up Intersection Observers.
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
	 * @description Sets the `navbarHeight` to 0, effectively hiding the navbar by resetting
	 * its height to zero.
	 */
	const hideNavbar = () => {
		setNavbarHeight(0);
	};

	useEffect(() => {
		// Handles cleanup and event management on component unmount.
		navbarTimer = setTimeout(hideNavbar, 5000);
		containerDiv.current.addEventListener('mousemove', mouseMove, true);
		window.addEventListener('mousemove', mouseMove, true);

		window.addEventListener('touchmove', mouseMove, true);
		window.addEventListener('click', mouseMove, true);
		window.addEventListener('touchmove', scroll, true);
		portalDiv.current.addEventListener('scroll', scroll, true);
		window.addEventListener('scroll', scroll, true);
		window.addEventListener('wheel', scroll, true);

		return () => {
			if (containerDiv.current) {
				containerDiv.current.removeEventListener('mousemove', mouseMove, true);
				window.removeEventListener('mousemove', mouseMove, true);

				window.removeEventListener('touchmove', mouseMove, true);
				window.removeEventListener('click', mouseMove, true);
				window.removeEventListener('touchmove', scroll, true);
				portalDiv.current.removeEventListener('scroll', scroll, true);
				window.removeEventListener('scroll', scroll, true);
				window.removeEventListener('wheel', scroll, true);
				/*
				containerDiv.current.removeEventListener('mousemove', mouseMove, true);
				window.document.removeEventListener('mousemove', mouseMove, true);
				window.document.removeEventListener('touchmove', mouseMove, true);
				portalDiv.current.removeEventListener('scroll', scroll, true);
				window.removeEventListener('scroll', scroll, true);
				window.removeEventListener('wheel', scroll, true);
				window.removeEventListener('touchmove', scroll, true);*/
			}
			clearTimeout(navbarTimer);
		};
	}, []);
	useEffect(() => {
		// Handles window resizes.
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
		// Adds/removes event listeners.
		const listener = keyDown(sliderRef, displayType);
		window.addEventListener('keydown', listener);
		return () => {
			window.removeEventListener('keydown', listener);
		};
	}, [displayType]);

	/**
	 * @description Determines whether the current device orientation is portrait mode
	 * by comparing the inner height and width of the browser window. It returns a boolean
	 * value indicating if the device is in portrait mode (true) or landscape mode (false).
	 *
	 * @returns {boolean} True when the device's inner height is greater than its inner
	 * width and false otherwise.
	 */
	const isPortrait = () => {
		return window.innerHeight > window.innerWidth;
	};

	/**
	 * @description Handles a change event for a display type selection input field. It
	 * updates the display type, closes or resets certain UI elements, and triggers an
	 * item click event with a delay based on the selected display type and current screen
	 * orientation.
	 *
	 * @param {object} e - An event object representing the change of display type.
	 */
	const displayTypeChange = (e) => {
		setDisplayType(e.target.value);
		if ((leftbarOpen || leftbarWidth > 0) && isPortrait()) {
			closeBigInfo();
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
					closeBigInfo();
				}
			} else if (leftbarOpen) {
				if (!isPortrait()) {
					setCurrentLeftbarWidth(defaultLeftbarWidth);
					setLeftbarWidth(defaultLeftbarWidth);
				} else {
					closeBigInfo();
				}
			}
			setTimeout(() => {
				// Delays the execution.
				itemClick(selectedItem, e.target.value)({ detail: clickNum });
			}, delay);
		} else {
			closeBigInfo();
			setTimeout(() => {
				// Executes immediately.
				itemClick(selectedItem, e.target.value)({ detail: 0 });
			}, 10);
		}
	};
	/**
	 * @description Sets a thumb size and, if not already displaying thumbnails, switches
	 * to display type 'thumbnails'.
	 *
	 * @param {number} s - For setting thumbnail size.
	 */
	const thumbSizeSlide = (s) => {
		setThumbSize(s);
		if (displayType !== 'thumbnails') {
			setDisplayType('thumbnails');
		}
	};
	/**
	 * @description Sets thumb spacing to a specified value and, if not already in
	 * thumbnails display type, switches to it, updating UI accordingly.
	 *
	 * @param {number} s - Slide spacing value.
	 */
	const thumbSpacingSlide = (s) => {
		setThumbSpacing(s);
		if (displayType !== 'thumbnails') {
			setDisplayType('thumbnails');
		}
	};
	/**
	 * @description Changes the display type to 'slide' if it is not already set, and
	 * toggles between fullscreen and non-fullscreen mode based on the current state.
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
	 * @description Handles scrolling behavior for a container element when the user
	 * scrolls with their mouse or trackpad. It calculates the scroll amount based on the
	 * scroll event and updates the container's scroll position accordingly, using an
	 * instant scrolling effect.
	 *
	 * @param {WheelEvent} e - Used to detect mouse wheel scrolling.
	 */
	const slideScroll = (e) => {
		if (displayType !== 'slide' && displayType !== 'list') return;
		//scroll();
		const container = portalDiv.current;
		const scrollAmount = e.deltaY / 1.5;
		container.scrollTo({
			top: 0,
			left: container.scrollLeft + scrollAmount,
			behavior: 'instant',
		});
	};
	/**
	 * @description Clicks on the previous media slide item that is not selected, assuming
	 * it exists and is a sibling element to the currently selected one. The function
	 * relies on a previously defined `styles` object and access to a DOM node's current
	 * reference through the `sRef.current` property.
	 *
	 * @param {React.RefObject<HTMLElement>} sRef - Likely a reference to a DOM element
	 * containing media items.
	 *
	 * @param {string} displayType - Unused.
	 */
	const previous = (sRef, displayType) => {
		sRef.current.querySelector('.' + styles['mediaslide-item-selected'])?.previousElementSibling.click();
	};
	/**
	 * @description Navigates to the next media slide element when called, by simulating
	 * a click on its sibling element. It uses the `sRef.current` reference to access the
	 * DOM node and then selects the next sibling with a class indicating it is selected,
	 * and clicks it.
	 *
	 * @param {React.RefObject<HTMLElement>} sRef - Used as a reference to an HTML element.
	 *
	 * @param {unknown} displayType - Unused.
	 */
	const next = (sRef, displayType) => {
		sRef.current.querySelector('.' + styles['mediaslide-item-selected'])?.nextElementSibling.click();
	};
	/**
	 * @description Returns an event handler that listens for arrow key presses on the
	 * keyboard. It calls either the `previous` or `next` functions based on the pressed
	 * key, passing a reference (`sRef`) as an argument to these functions.
	 *
	 * @param {object} sRef - Referenced elsewhere in the codebase.
	 *
	 * @returns {Function} A reference to an anonymous function that takes one argument
	 * `e`. This returned function evaluates expressions based on key presses when called.
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
					height: navbarHeight > 0 ? viewportHeight - navbarHeight : viewportHeight,
					top: navbarHeight,
					contain: 'content',
					width: leftbarWidth,
					left: -(leftbarWidth - currentLeftbarWidth),
				}}
			>
				<div style={{ position: 'relative', height: 'inherit', top: navbarHeight }}>{bigInfo}</div>
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
						top: navbarHeight,
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
