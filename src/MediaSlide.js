import PropTypes from 'prop-types';
import { useEffect, useRef, useState, useCallback } from 'react';
import { version } from '../package.json';
import styles from './MediaSlide.module.css';
import Slider from 'react-slider';
import * as React from 'react';

/**
 * @description Renders a media gallery with various display types (list, details,
 * thumbnails, and slide). It handles user interactions, such as clicking on items,
 * scrolling, and changing display type. The gallery also features navigation controls
 * for playback and slideshow functionality.
 *
 * @param {any} props - Used to pass custom properties to the component.
 *
 * @returns {React.ReactElement} A JSX element representing a slideshow with various
 * display options, navigation controls, and event handling functions.
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
							<img src={item.thumb} width="32" /> {item.title}
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
								<img src={item.thumb} width="64" /> {item.title}
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
							<img src={item.thumb} width={ts} />
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
							<img src={item.thumb} height={ts - 80} />
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
	const [firstPageLoaded, setFirstPageLoaded] = useState(page == 0);
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
	 * @description Sets the current left bar width to zero, closes the left bar, and
	 * marks it as opened (in a closed state). It updates several states simultaneously
	 * to modify the UI component's appearance and behavior.
	 */
	const closeBigInfo = () => {
		setCurrentLeftbarWidth(0);
		setLeftbarOpen(false);
		setLeftbarOpened(true);
	};
	/**
	 * @description Returns an anonymous function that sets `leftbarOpened` to `true`,
	 * resets `currentLeftbarWidth` to `0`, and calls `itemClick` with arguments `i`,
	 * `'slide'`, and `{ detail: 2 }`. This enables the full-screen mode.
	 *
	 * @param {number} i - Referenced later as an item index.
	 *
	 * @returns {Function} A higher-order function that takes no arguments and invokes
	 * when called. This returned function sets state variables, calls another function
	 * (`itemClick`) with parameters, and does not return any value.
	 */
	const goFullscreen = (i) => {
		return () => {
			setLeftbarOpened(true);
			setCurrentLeftbarWidth(0);
			itemClick(i, 'slide')({ detail: 2 });
		};
	};
	const [bigInfo, setBigInfo] = useState(
		initialSelection && typeof renderBigInfo == 'function'
			? renderBigInfo(initialSelection, closeBigInfo, goFullscreen)
			: null,
	);
	const doLoadingTimer = useCallback(() => {
		// Restarts itself after delay.

		if (loadedPages.length == loadingPages.length) {
			setLoadingComplete(true);
			console.log('LOADING complete');
		} else {
			setTimeout(() => {
				// Waits for 2 seconds before executing.

				doLoadingTimer();
			}, 2000);
		}
	}, [loadedPages, loadingPages]);
	useEffect(() => {
		// Sets a timer.

		setTimeout(() => {
			// Delays execution for 3 seconds before calling `doLoadingTimer()`.

			doLoadingTimer();
		}, 3000);
	}, []);

	if (!loadedPages.includes(page)) setLoadedPages([...loadedPages, page]);
	const currentlyLoading = !(loadedPages.length == loadingPages.length);

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
		// Updates UI state based on page change.

		if (page == 0) setFirstPageLoaded(true);
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
			useThumbSize = stageHeight == 0 ? viewportHeight - navbarHeight : (viewportHeight - navbarHeight) * 0.25;
			break;
	}
	/**
	 * @description Changes the navigation bar's height and hides it if the mouse cursor
	 * is within a certain distance from the top edge of the screen for a specified
	 * duration without moving above that threshold.
	 *
	 * @param {Event} e - Used to track mouse movement.
	 */
	const mouseMove = (e) => {
		if (e.clientY < 60) {
			if (displayType != 'slide') {
				clearTimeout(navbarTimer);

				navbarTimer = setTimeout(hideNavbar, 5000);
			}
			setNavbarHeight(defaultNavbarHidden ? 0 : 60);
		}
	};
	/**
	 * @description Clears a timeout if the display type is not 'slide', then sets a new
	 * timeout to hide the navbar after 5000 milliseconds. It also updates the navbar
	 * height based on the default hidden state.
	 */
	const scroll = () => {
		if (displayType != 'slide') {
			clearTimeout(navbarTimer);

			navbarTimer = setTimeout(hideNavbar, 5000);
		}
		setNavbarHeight(defaultNavbarHidden ? 0 : 60);
	};
	/**
	 * @description Returns an event handler for click events on items within a slider.
	 * It updates the selected item, changes the display type if necessary, and applies
	 * CSS classes to the clicked item. It also handles left bar visibility and scrolling
	 * when necessary.
	 *
	 * @param {number} i - Item ID for which an event listener is set.
	 *
	 * @param {null} newDisplayType - Used to specify the display type for item selection.
	 *
	 * @returns {(EventTarget) => void} An arrow function that handles a click event on
	 * an item.
	 */
	const itemClick = (i, newDisplayType = null) => {
		return (e) => {
			if (!newDisplayType) newDisplayType = displayType;
			if (!i) return;

			if (selectedItem != i || e.detail > 1 || e.detail < 1) {
				if (selectedItem) {
					sliderRef.current
						.querySelector('li[data-id="' + selectedItem.id + '"]')
						?.classList?.remove(styles['mediaslide-item-selected']);
				}
				setSelectedItem(i);
				if (typeof selectionChange == 'function') {
					selectionChange(i);
				}
				setBigInfo(renderBigInfo(i, closeBigInfo, goFullscreen));

				let dt = newDisplayType;
				if (displayType != 'slide' && e.detail > 1) {
					dt = 'slide';
					setDisplayType('slide');
					//setLeftbarWidth(0);
					setLeftbarOpened(true);
					setCurrentLeftbarWidth(0);
				}
				if (dt != 'slide' && !leftbarOpen && e.detail > 0) {
					setLeftbarWidth(defaultLeftbarWidth || 200);
					setCurrentLeftbarWidth(defaultLeftbarWidth || 200);
					setLeftbarOpen(true);
					setLeftbarOpened(false);
				} else if (dt == 'slide' && leftbarOpen && e.detail > 0) {
					//setLeftbarWidth(0);

					setLeftbarOpened(true);
				}
				sliderRef.current
					.querySelector('li[data-id="' + i.id + '"]')
					?.classList?.add(styles['mediaslide-item-selected']);
				if (dt == 'slide' || e.detail < 1) {
					setTimeout(() => {
						// Scrolls an HTML element into view after a delay.

						sliderRef.current
							.querySelector('li[data-id="' + i.id + '"]')
							?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
					}, 500);
				}
				if (dt == 'slide' || e.detail > 1) {
					flipDoubleBuffer(i, dt);
				}
			}
		};
	};

	/**
	 * @description Handles rendering and switching between two double buffers for
	 * displaying a slideshow, depending on the current buffer status and file type (HTML
	 * or image). It also communicates with the main thread via postMessage to notify
	 * when slides are ready.
	 *
	 * @param {object} i - Used to represent slide metadata.
	 *
	 * @param {number} dt - Ignored in this implementation.
	 */
	const flipDoubleBuffer = (i, dt) => {
		if (currentDoubleBuffer == 1) {
			/**
			 * @description Changes the opacity of certain buffer elements to specific values,
			 * removes the 'load' event listener from one buffer element, and sets a global state
			 * variable to a new value. The purpose appears to be managing the visual appearance
			 * of double buffers during file operations.
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
			 * @description Posts a message to all windows (*) with the name 'slideReady' and an
			 * empty object as its payload, triggering an event listener that may be listening
			 * for this type of message. This is often used for communication between iframes or
			 * web workers.
			 */
			const r = () => {
				window.postMessage({ request: 'slideReady' }, '*');
			};
			if (
				i?.metadata?.files &&
				i.metadata.files.length > 0 &&
				i.metadata.files[0]?.mediaType?.substring(0, 9) == 'text/html'
			) {
				/**
				 * @description Responds to a message event by updating the opacity and filter styles
				 * of various HTML elements, then removes itself as an event listener. It also sets
				 * the current double buffer to 2. The purpose is likely to handle a "slideReady"
				 * event in a web application.
				 *
				 * @param {Event} e - Used to pass data from an external source.
				 */
				const messageHandler = (e) => {
					if (e.data.request == 'slideReady') {
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
					// Sets buffer to file Buffer 1.

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
			 * @description Transitions between two buffers and a file buffer, setting their
			 * opacity properties accordingly. It also removes an event listener from the second
			 * buffer once its operation is completed. The `setCurrentDoubleBuffer` state hook
			 * is updated to point to the first buffer.
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
			 * @description Posts a message to all windows (`'*'`) with the `postMessage` method,
			 * sending an object with the property `request` set to `'slideReady'`. This likely
			 * signals to other windows or scripts that the slide is ready for interaction.
			 */
			const r = () => {
				window.postMessage({ request: 'slideReady' }, '*');
			};
			if (
				i?.metadata?.files &&
				i.metadata.files.length > 0 &&
				i.metadata.files[0]?.mediaType?.substring(0, 9) == 'text/html'
			) {
				/**
				 * @description Sets the opacity and filter of specific HTML elements (fileDoubleBuffer1,
				 * fileDoubleBuffer2, doubleBuffer1, and doubleBuffer2) based on a message received
				 * from another source. It also removes the event listener and updates a state variable
				 * (`setCurrentDoubleBuffer`) to 1.
				 *
				 * @param {Event} e - Used to capture message events sent from another origin.
				 */
				const messageHandler = (e) => {
					if (e.data.request == 'slideReady') {
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
					// Sets file buffer.

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
			let lElement;
			if (page < totalPages) {
				if (displayType == 'details') {
					lElement = (
						<caption
							style={{
								paddingLeft: thumbSpacing,
								paddingRight: thumbSpacing,
								paddingBottom: thumbSpacing,
							}}
							ref={loadMoreRef}
						>
							{loadingIndicator}
						</caption>
					);
				} else {
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
			}
			let fElement;
			if (!firstPageLoaded) {
				if (displayType == 'details') {
					fElement = (
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
				} else {
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
			}
			if (displayType == 'details') {
				items = (
					<table
						ref={sliderRef}
						style={{ tableLayout: 'fixed' }}
						className={styles['mediaslide-' + displayType + '-ul']}
					>
						<tbody>
							{fElement}
							{gallery.map(itemHTML(itemClick, useThumbSize, thumbSpacing))}
							{lElement}
						</tbody>
					</table>
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
			// Adds pages to loading list.

			setLoadingPages([...loadingPages, p]);
		},
		[loadingPages],
	);

	const loadingContains = useCallback(
		(p) => {
			// Checks if a page is in an array of loading pages.

			return loadingPages.includes(p);
		},
		[loadingPages],
	);

	const endOb = useCallback(() => {
		// Loads more data and updates loading status.

		if (rightPageCursor < totalPages && !loadingContains(rightPageCursor + 1)) {
			onLoadMoreData({ page: rightPageCursor }, 1);
			addLoading(rightPageCursor + 1);
		}
	}, [rightPageCursor, totalPages, gallery]);
	const startOb = useCallback(() => {
		// Loads more data when conditions met.

		if (!firstPageLoaded && leftPageCursor != 0 && !loadingContains(leftPageCursor - 1)) {
			onLoadMoreData({ page: leftPageCursor }, -1);
			addLoading(leftPageCursor - 1);
		}
	}, [leftPageCursor, firstPageLoaded, loadingPages]);

	useEffect(() => {
		// Observes scroll position.

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
	}, [loadMoreRef.current, loadPrevRef.current, page, leftPageCursor, rightPageCursor]);
	/**
	 * @description Sets the value of `navbarHeight` to 0, effectively hiding a navigation
	 * bar or other UI component.
	 */
	const hideNavbar = () => {
		setNavbarHeight(0);
	};

	useEffect(() => {
		// Initializes event listeners and sets a timeout for navigation.

		navbarTimer = setTimeout(hideNavbar, 5000);
		containerDiv.current.addEventListener('mousemove', mouseMove, true);
		window.document.addEventListener('mousemove', mouseMove, true);
		portalDiv.current.addEventListener('scroll', scroll, true);
		return () => {
			if (containerDiv.current) {
				containerDiv.current.removeEventListener('mousemove', mouseMove, true);
				window.document.removeEventListener('mousemove', mouseMove, true);
				portalDiv.current.removeEventListener('scroll', scroll, true);
			}
			clearTimeout(navbarTimer);
		};
	}, []);
	useEffect(() => {
		// Observes container resize and updates width parameters.

		const resizeObserver = new ResizeObserver((event) => {
			setViewportWidth(event[0].contentBoxSize[0].inlineSize);
			setViewportHeight(event[0].contentBoxSize[0].blockSize);
			let leftbarW = event[0].contentBoxSize[0].inlineSize * leftbarWidthRatio;
			if (leftbarW == 0) return;
			if (leftbarW > 600) leftbarW = 600;

			setDefaultLeftbarWidth(leftbarW);
			setLeftbarWidth(leftbarW);

			if (!selectedItem && initialSelection) {
				//itemClick(initialSelection,'slide')({detail:1})
				setLeftbarWidth(leftbarW || 200);
				setCurrentLeftbarWidth(leftbarW || 200);
				setLeftbarWidth(leftbarW || 200);
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
		// Listens for keyboard events.

		const listener = keyDown(sliderRef, displayType);
		window.addEventListener('keydown', listener);
		return () => {
			window.removeEventListener('keydown', listener);
		};
	}, [displayType]);

	/**
	 * @description Updates the display type based on the value selected from a dropdown
	 * menu. If the selection is not 'slide', it resets certain state variables and
	 * performs specific actions, such as resetting buffer files, updating leftbar width,
	 * and triggering an item click event.
	 *
	 * @param {Event} e - Used to retrieve information about the event that triggered the
	 * function.
	 */
	const displayTypeChange = (e) => {
		setDisplayType(e.target.value);
		if (e.target.value != 'slide') {
			setFileBuffer1('');
			setFileBuffer2('');
			let delay = 10;
			let clickNum = 0;
			if (leftbarOpen && leftbarWidth == 0) {
				delay = 400;
				clickNum = 0;

				setBigInfo('');
				setLeftbarWidth(defaultLeftbarWidth);
			} else if (leftbarOpen) {
				setCurrentLeftbarWidth(defaultLeftbarWidth);
				setLeftbarWidth(defaultLeftbarWidth);
			}
			setTimeout(() => {
				// Calls itemClick with parameters and executes after delay milliseconds.

				itemClick(selectedItem, e.target.value)({ detail: clickNum });
			}, delay);
		} else {
			setCurrentLeftbarWidth(0);
			setTimeout(() => {
				// Calls 'itemClick' with arguments, then delays execution by 10ms.

				itemClick(selectedItem, e.target.value)({ detail: 0 });
			}, 10);
		}
	};
	/**
	 * @description Sets a thumb size and changes the display type to 'thumbnails' if it
	 * is not already set to that value. This suggests a mechanism for toggling between
	 * different views or layouts, possibly in an image gallery or media viewer application.
	 *
	 * @param {number} s - Intended for setting thumb size.
	 */
	const thumbSizeSlide = (s) => {
		setThumbSize(s);
		if (displayType != 'thumbnails') {
			setDisplayType('thumbnails');
		}
	};
	/**
	 * @description Sets the thumb spacing to a given value and, if necessary, updates
	 * the display type to 'thumbnails'.
	 *
	 * @param {number} s - Used to set the thumb spacing.
	 */
	const thumbSpacingSlide = (s) => {
		setThumbSpacing(s);
		if (displayType != 'thumbnails') {
			setDisplayType('thumbnails');
		}
	};
	/**
	 * @description Toggles the full-screen mode on or off, depending on its current
	 * state. If the display type is not 'slide', it sets it to 'slide'. It then switches
	 * the full-screen mode between true and false.
	 */
	const toggleFullscreen = () => {
		if (displayType != 'slide') {
			setDisplayType('slide');
		}
		if (isFullscreen) {
			setIsFullscreen(false);
		} else {
			setIsFullscreen(true);
		}
	};
	/**
	 * @description Scrolls a container element horizontally when an event (e.g., mouse
	 * wheel) is triggered. The scrolling amount is calculated based on the event's delta
	 * value, scaled down by a factor of 1.5. The scroll behavior is set to instant.
	 *
	 * @param {WheelEvent} e - Triggered by mouse wheel events.
	 */
	const slideScroll = (e) => {
		if (displayType != 'slide' && displayType != 'list') return;
		const container = portalDiv.current;
		const scrollAmount = e.deltaY / 1.5;
		container.scrollTo({
			top: 0,
			left: container.scrollLeft + scrollAmount,
			behavior: 'instant',
		});
	};
	/**
	 * @description Navigates to the previous media slide by finding the previously
	 * selected item, and if found, simulates a click on its previous sibling element.
	 * The selection is based on the provided `displayType`.
	 *
	 * @param {React.RefObject<HTMLDivElement>} sRef - Used to reference an HTML element.
	 *
	 * @param {string} displayType - Unused.
	 */
	const previous = (sRef, displayType) => {
		sRef.current.querySelector('.' + styles['mediaslide-item-selected'])?.previousElementSibling.click();
	};
	/**
	 * @description Selects the next sibling element of an element with a specific class,
	 * which is assumed to be a selected media slide item, and simulates a click on it.
	 *
	 * @param {React.RefObject<HTMLElement>} sRef - Used to reference an HTML element.
	 *
	 * @param {string} displayType - Ignored in the given code.
	 */
	const next = (sRef, displayType) => {
		sRef.current.querySelector('.' + styles['mediaslide-item-selected'])?.nextElementSibling.click();
	};
	/**
	 * @description Returns a callback function that is executed when an arrow key (left
	 * or right) is pressed. The callback calls either `previous` or `next` functions,
	 * depending on the pressed key, passing the `sRef` as an argument to both functions.
	 *
	 * @param {object} sRef - Referenced by the function.
	 *
	 * @returns {Function} A callback that takes an event object `e` as its argument and
	 * performs specific actions based on the key pressed.
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
				style={{ width: leftbarWidth, left: -(leftbarWidth - currentLeftbarWidth) }}
			>
				<div style={{ position: 'relative', top: navbarHeight }}>{bigInfo}</div>
			</div>
			<div
				className={styles.mediaslide + ' ' + styles['mediaslide-' + displayType]}
				style={{ height: viewportHeight }}
			>
				<nav
					className={styles['mediaslide-nav']}
					style={{ height: navbarHeight, visibility: navbarHeight == 0 ? 'hidden' : 'visible' }}
				>
					<label className={styles['mediaslide-nav-displaytype']}>
						<input
							className={styles['mediaslide-navbar-radio']}
							type="radio"
							name="displayType"
							value="list"
							onChange={displayTypeChange}
							checked={displayType == 'list'}
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
							checked={displayType == 'details'}
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
							checked={displayType == 'thumbnails'}
						/>
						Thumbnails
						<br />
						<div
							className={styles['mediaslide-slider-opacity']}
							style={{ opacity: displayType == 'thumbnails' ? '1' : '0.2' }}
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
							checked={displayType == 'slide'}
						/>
						Slide
						<br />
						<div
							className={styles['mediaslide-transport-opacity']}
							style={{ opacity: displayType == 'slide' ? '1' : '0.2' }}
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
							<button className={styles['mediaslide-transport-start']}>⏮</button>
							<button className={styles['mediaslide-transport-rewind']}>⏪︎</button>
							<button className={styles['mediaslide-transport-stop']}>⏹︎</button>
							<button className={styles['mediaslide-transport-play']}>⏵︎</button>
							<button className={styles['mediaslide-transport-forward']}>⏩︎</button>
							<button className={styles['mediaslide-transport-end']}>⏭</button>
						</div>
					</label>
				</nav>
				<section
					className={styles['mediaslide-slide-stage']}
					style={{
						height: displayType == 'slide' ? stageHeight : 0,
						opacity: displayType == 'slide' ? '1' : '0',
					}}
				>
					<div className={styles['mediaslide-double-buffer-container']} style={{ opacity: '1' }}>
						<img
							className={styles['mediaslide-double-buffer']}
							style={{ opacity: 0 }}
							src=""
							ref={doubleBuffer1}
							height={displayType == 'slide' ? stageHeight : 0}
						/>
						<img
							className={styles['mediaslide-double-buffer']}
							style={{ opacity: 0 }}
							src=""
							ref={doubleBuffer2}
							height={displayType == 'slide' ? stageHeight : 0}
						/>
						<div
							className={styles['mediaslide-double-buffer']}
							style={{
								opacity: 0,
								height: displayType == 'slide' ? stageHeight : 0,
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
								height: displayType == 'slide' ? stageHeight : 0,
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
							displayType == 'slide' && stageHeight != 0
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
