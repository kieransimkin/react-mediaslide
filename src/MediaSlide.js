import PropTypes from 'prop-types';
import { useEffect, useRef, useState, useCallback } from 'react';
import { version } from '../package.json';
import styles from './MediaSlide.module.css';
import Slider from 'react-slider';
import * as React from 'react';

/**
 * @description Renders a media gallery component with various display types, such
 * as list, details, thumbnails, and slide, allowing users to navigate and select
 * items, including loading more data on demand and handling events like mouse moves
 * and key presses.
 *
 * @param {object} props - Used to pass properties or arguments to the component.
 *
 * @returns {React.ReactElement} A JSX element representing a media slide display
 * container with various features such as navigation, thumbnails, and loading indicators.
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
	 * @description Resets the left bar to a closed state, clears any pending timeout for
	 * hiding the navbar, and schedules a new timeout to hide the navbar after 5 seconds.
	 * It also adjusts the navbar height based on its default hidden value.
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
	 * @description Returns an anonymous function that sets a left bar to open state,
	 * resets its width to zero, and triggers a slide transition when clicked on item i
	 * with detail value 2.
	 *
	 * @param {number} i - Used to identify an item.
	 *
	 * @returns {Function} An anonymous function that sets certain states and calls another
	 * function (`itemClick`) with a specific argument.
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
			: null, [initialSelection]
	) ;
	const doLoadingTimer = useCallback(() => {
		if (loadedPages.length === loadingPages.length) {
			setLoadingComplete(true);
			console.log('LOADING complete');
		} else {
			setTimeout(() => {
				// Executes a callback after 2 seconds.
				doLoadingTimer();
			}, 2000);
		}
	}, [loadedPages, loadingPages]);
	useEffect(() => {
		// Schedules a callback to run after a delay of 3 seconds.
		setTimeout(() => {
			// Calls doLoadingTimer() after a delay of 3 seconds.
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
		// Updates state and scrolls to item on page change.
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
	 * @description Monitors mouse movement on a client. If the client's y-coordinate is
	 * below 60, it schedules to hide the navbar after 5 seconds if displayType is not
	 * 'slide'. It also updates the navbar height accordingly, depending on the
	 * defaultNavbarHidden state.
	 *
	 * @param {Event} e - Used to handle mouse movement events.
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
	 * @description Updates the navigation bar's height based on its initial state and
	 * checks if it's not a slide display type. If so, it clears any existing timer to
	 * hide the navbar after 5 seconds and sets up a new one.
	 */
	const scroll = () => {
		if (displayType !== 'slide') {
			clearTimeout(navbarTimer);

			navbarTimer = setTimeout(hideNavbar, 5000);
		}
		setNavbarHeight(defaultNavbarHidden ? 0 : 60);
	};
	/**
	 * @description Handles click events on media items, updating display type and focus
	 * state accordingly. It also manages the selection of an item, scrolling, and updating
	 * related states such as left bar width and openness.
	 *
	 * @param {number} i - Intended to represent an item ID.
	 *
	 * @param {null} newDisplayType - Optional.
	 *
	 * @returns {Function} A click event handler that will be called when an item is
	 * clicked. This handler may change the selected item and update various state variables
	 * and renderings accordingly.
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
	 * @description Handles image rendering and switching between two buffers, allowing
	 * for seamless transitions between slides. It loads images into one buffer while
	 * displaying the other, then swaps them when the first is loaded or a message from
	 * the main thread is received.
	 *
	 * @param {object} i - Used to represent a single slide or file.
	 *
	 * @param {number} dt - Not used anywhere in the function.
	 */
	const flipDoubleBuffer = (i, dt) => {
		if (currentDoubleBuffer === 1) {
			/**
			 * @description Sets the opacity to full for one double buffer, clears the opacity
			 * of two other buffers, removes a 'load' event listener from a third buffer, and
			 * updates the current double buffer index to 2.
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
			 * @description Sends a message to all windows or iframes on the same origin via the
			 * `postMessage` method, indicating that slides are ready for rendering.
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
				 * @description Listens for a specific message, handles it by updating the opacity
				 * and filter styles of various DOM elements, and removes itself as an event listener
				 * when the task is complete. It sets up a new double buffer and prepares for subsequent
				 * tasks.
				 *
				 * @param {Event} e - Used for handling event data from the window's message system.
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
					// Sets a buffer value.
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
			 * @description Transitions to a new buffer and removes an event listener. It sets
			 * one current buffer's opacity to 1, others to 0, and updates the main state variable
			 * `setCurrentDoubleBuffer`. Additionally, it removes an event listener 'load' from
			 * another buffer, presumably when its load operation completes.
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
			 * @description Sends a message to all frames or windows on the current domain using
			 * the postMessage API, with the data being an object containing a request property
			 * set to 'slideReady'.
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
				 * @description Responds to a message event when data is received from an external
				 * source, typically indicating that a slide is ready for display. It updates the
				 * opacity and filter styles of various buffer elements based on their current state.
				 *
				 * @param {Event} e - Related to event handling.
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
					// Handles results.
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
		// Sets up Intersection Observers for lazy loading of content.
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
	 * @description Resets the height of a navigation bar to zero, indicating its visibility
	 * is off or hidden. It calls another function named `setNavbarHeight`, passing `0`
	 * as an argument to configure the new state.
	 */
	const hideNavbar = () => {
		setNavbarHeight(0);
	};

	useEffect(() => {
		// Handles DOM event listeners and navbar hiding.
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
		// Monitors screen size changes.
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
		// Adds keydown event listener to window.
		const listener = keyDown(sliderRef, displayType);
		window.addEventListener('keydown', listener);
		return () => {
			window.removeEventListener('keydown', listener);
		};
	}, [displayType]);

	/**
	 * @description Determines whether a device's screen orientation is portrait mode.
	 * It compares the inner height and inner width of the window, returning true if the
	 * height is greater than the width, indicating a portrait orientation.
	 *
	 * @returns {boolean} True if the viewport's height is greater than its width, and
	 * false otherwise.
	 */
	const isPortrait = () => {
		return window.innerHeight > window.innerWidth;
	};

	/**
	 * @description Updates display type based on user input, adjusts leftbar state and
	 * width as needed, and triggers item click event with a delay to handle various
	 * scenarios such as screen orientation changes or initial page load.
	 *
	 * @param {Event} e - An event object.
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
				// Delays the call to `itemClick` method.
				itemClick(selectedItem, e.target.value)({ detail: clickNum });
			}, delay);
		} else {
			closeBigInfo();
			setTimeout(() => {
				// Delays.
				itemClick(selectedItem, e.target.value)({ detail: 0 });
			}, 10);
		}
	};
	/**
	 * @description Takes a size parameter, sets the thumb size using `setThumbSize`, and
	 * then changes the display type to 'thumbnails' if it is not already set as such
	 * using `setDisplayType`.
	 *
	 * @param {number} s - Slide size.
	 */
	const thumbSizeSlide = (s) => {
		setThumbSize(s);
		if (displayType !== 'thumbnails') {
			setDisplayType('thumbnails');
		}
	};
	/**
	 * @description Updates the thumb spacing when called with a specific value. It also
	 * sets the display type to 'thumbnails' if it is not already set as such, likely
	 * affecting the layout or appearance of an interface.
	 *
	 * @param {number} s - Spacing value.
	 */
	const thumbSpacingSlide = (s) => {
		setThumbSpacing(s);
		if (displayType !== 'thumbnails') {
			setDisplayType('thumbnails');
		}
	};
	/**
	 * @description Updates display type to 'slide' and toggle fullscreen state based on
	 * current state, allowing users to switch between normal view and full screen view
	 * when display type is not set to 'slide'.
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
	 * @description Handles mouse wheel scrolling on a portal div container, adjusting
	 * its left scroll position based on the delta Y value (scroll amount) and an adjustable
	 * factor for smoother movement.
	 *
	 * @param {WheelEvent} e - Related to mouse wheel events.
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
	 * @description Navigates to the previous media item within a selection, if it exists,
	 * by clicking on its element's previous sibling element, which is selected based on
	 * a class name that indicates the currently selected item.
	 *
	 * @param {React.RefObject<HTMLDivElement>} sRef - An object that references a DOM element.
	 *
	 * @param {string} displayType - Unused in this function.
	 */
	const previous = (sRef, displayType) => {
		sRef.current.querySelector('.' + styles['mediaslide-item-selected'])?.previousElementSibling.click();
	};
	/**
	 * @description Selects the next media slide by querying for an element with a class
	 * name matching 'mediaslide-item-selected' on the current reference (`sRef`) and
	 * then clicking its immediate sibling element.
	 *
	 * @param {React.RefObject<HTMLElement>} sRef - Used to refer to an HTML element.
	 *
	 * @param {never} displayType - Not used in the function implementation.
	 */
	const next = (sRef, displayType) => {
		sRef.current.querySelector('.' + styles['mediaslide-item-selected'])?.nextElementSibling.click();
	};
	/**
	 * @description A callback that listens for arrow key presses on an element. When the
	 * 'ArrowLeft' or 'ArrowRight' keys are pressed, it calls the `previous` and `next`
	 * functions respectively with the provided `sRef` as an argument.
	 *
	 * @param {object} sRef - Used as an argument for another function call.
	 *
	 * @returns {Function} A single argument (event object) and returns undefined. This
	 * returned value has been wrapped with an additional layer of closure allowing it
	 * to capture the scope in which it was created.
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
					height: navbarHeight > 0 ? viewportHeight-navbarHeight : viewportHeight,
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
