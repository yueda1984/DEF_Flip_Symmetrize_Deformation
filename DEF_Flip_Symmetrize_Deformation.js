/*
	Flip-Symmetrize Deformation

	Toon Boom Harmony dialog script for mirror, flip or symmetrize envelope deformers.
	The script can also flip curve and bone deformers. Tested on Harmony Premium 14 and up.
	
		v1.1 - Layout adjustment.
		v1.11 - Main dialog widget acts as a child of Harmony application.
		v1.12 - Clear keyframes and set new key to frame 1 when "Also apply to resting parameters" option is on.
	

	Installation:
	
	1) Download and Unarchive the zip file.
	2) Locate to your user scripts folder (a hidden folder):
	   https://docs.toonboom.com/help/harmony-17/premium/scripting/import-script.html	
	   
	3) Add all unzipped files (*.js, *.ui, and script-icons folder) directly to the folder above.   	
	4) Add DEF_Flip_Symmetrize_Deformation to any toolbar.	

	
	Direction:
	
	1) For curve, bone and open envelope deformers, select a deformer in Camera view and run this script.	
	   For closed envelope deformer, select one of point, which should be roughly on the line of symmetry
	   for the shape and orientation. If the line is between two points, select both points.
	   
	2) After choose right setting, hit Apply.
	
	3) Additionally you can check "Also apply to resting parameters" box for making the transformed shape as the 
	   deformer's resting position. This option should not be used while animating,
	   as it will affect multiple keyframes on the deformer.

	
	Author:

		Yu Ueda		
		Many more useful scripts hor Toon Boom Harmony are available. Please visit raindropmoment.com	
*/

var scriptVer = "1.12";



function DEF_Flip_Symmetrize_Deformation()
{	
	var pd = new private_dialog;	
	pd.showUI();
}






function private_dialog()
{
	var pf = new private_functions;	
	var defNodes = {};
	var numNodes = 0;
	var apexIdx = [];
	var pref = {};
	
	this.refreshSelection = function()
	{	
		var sNodes = selection.selectedNodes();
		pref.operation = "undefined";		
		
		var apex = [];
		for (var n in sNodes)
		{
			var sNodeType = node.type(sNodes[n]);		
			if (sNodeType == "CurveModule" || sNodeType == "OffsetModule" || sNodeType == "BendyBoneModule")
				apex.push(sNodes[n]);
		}
		
		if (apex.length == 0)
			return;

		var group = node.parentNode(apex[0]);
		var numSubNodes = node.numberOfSubNodes(group);	
		var firstNode = pf.findFirstNode(apex, numSubNodes);
		
		// track down the chain and add all dst nodes to defNodes array
		defNodes = pf.getNodesInOrder(firstNode, numSubNodes);
		apexIdx = pf.getApexIdx(apex, defNodes);			
		numNodes = Object.keys(defNodes).length;
		
		if (defNodes[0].type == "BendyBoneModule")
		{
			pref.parented = "N";
			pref.operation = "bone";
		}	
		else
		{
			var jointNode = defNodes[numNodes -1].node;	
			pref.parented = node.getTextAttr(jointNode, 1, "localreferential");			
			if (pref.parented == "Y")
				pref.operation = "curve";

			else
			{		
				var pathIsClosed = node.getTextAttr(jointNode, 1, "closepath");				
				if (pathIsClosed == "Y")
				{
					pref.closedPath = true;
					pref.operation = (apex.length > 2) ? "tooManySelection" : "closedEnvelope";
				}
				else
					pref.operation = "openEnvelope";
			}
		}
	}
	this.refreshSelection();

	// load preference, set ui state
	this.showUI = function()
	{
		var savedPref = pf.loadPref();	
		this.ui.show();	
			
		this.ui.mirrorRB.checked = savedPref.mirrorBool;
		this.ui.flipRB.checked = savedPref.flipBool;
		this.ui.symmetryRB.checked = savedPref.symmetryBool;
		this.ui.verticalRB.checked = savedPref.veticalBool;
		this.ui.horizontalRB.checked = savedPref.horizontalBool;
		this.ui.centroidRB.checked = savedPref.centroidBool;
		this.ui.originRB.checked = savedPref.originBool;
		this.ui.offsetRB.checked = savedPref.offsetBool;
		this.ui.rightRB.checked = savedPref.rightBool;
		this.ui.leftRB.checked = savedPref.leftBool;
		this.ui.restingCB.checked = false;
		this.ui.x = savedPref.x;
		this.ui.y = savedPref.y;
		var coordX = savedPref.x;
		var coordY = savedPref.y;
			
		if (about.isWindowsArch())
		{
			coordX += 8;
			coordY += 31;
		}		
		this.ui.move(coordX, coordY);
		
		this.setAvailability();
	}

	
	this.setAvailability = function()
	{
		this.ui.modeBox.enabled = true;
		this.ui.axisBox.enabled = true;
		this.ui.originBox.enabled = true;			
		this.ui.restingCB.enabled = true;
				
		var imagePath = specialFolders.userScripts;
		if (imagePath == undefined)
			imagePath = pf.getUserScriptPath();
		
		imagePath += "/script-icons/Flip_Symmetrize_Deformation";

		if (pref.operation == "undefined" || pref.operation == "tooManySelection")
		{			
			this.ui.applyButton.enabled = false;

			imagePath += "/deformation.png";
			var pix = new QPixmap;
			pix.load(imagePath);
			this.ui.hintImage1.pixmap = pix;			
			this.ui.hintImage2.hide();
			this.ui.hintImage2Label.hide();	

			if (pref.operation == "undefined")
				this.ui.hintImage1Label.text = "Please select a point on a deformer\n";
			else
				this.ui.hintImage1Label.text = "Too many points selected\nPlease select only 1-2 points";
		}
		else
		{
			this.ui.mirrorRB.text = "Mirror while maintaining sides of points";
			this.ui.flipRB.text = "Flip";
			
			if (this.ui.flipRB.checked)
			{
				this.ui.mirrorRB.text = "Mirror";				
				this.ui.flipRB.text = "Flip by moving points across axis";
			}
			else if (this.ui.symmetryRB.checked)
			{
				this.ui.mirrorRB.text = "Mirror";					
				this.ui.flipRB.text = "Flip";
			}
			this.ui.applyButton.enabled = true;
			this.ui.hintImage2.show();
			this.ui.hintImage2Label.show();			
	
			if (pref.operation == "bone" || pref.operation == "curve")
			{			
				this.ui.mirrorRB.hide();	
				this.ui.symmetryRB.hide();	
				this.ui.flipRB.checked = true;
				this.ui.centroidRB.hide();
				this.ui.offsetRB.text = "Deformation Offset";
				if (this.ui.centroidRB.checked)
					this.ui.offsetRB.checked = true;
				
				if (pref.operation == "bone" )
				{						
					imagePath += "/bone.png";
					this.ui.hintImage1Label.text = "Bone Deformer Selected\n";
				}
				else
				{
					imagePath += "/curve.png";
					this.ui.hintImage1Label.text = "Curve Deformer Selected\n";
				}
				var pix = new QPixmap;
				pix.load(imagePath);
				this.ui.hintImage1.pixmap = pix;
				this.ui.hintImage2.hide();
				this.ui.hintImage2Label.hide();				
			}
			else if (pref.operation == "closedEnvelope" || pref.operation == "openEnvelope")
			{			
				this.ui.mirrorRB.show();
				this.ui.symmetryRB.show();
				this.ui.centroidRB.show();						
				
				if (pref.operation == "closedEnvelope")
				{
					this.ui.offsetRB.text = "Selected Point(s)";
					if (this.ui.horizontalRB.checked)
						imagePath1 = imagePath + "/envelope_h1.png";
					else
						imagePath1 = imagePath + "/envelope_v1.png";					

					var pix = new QPixmap;	
					pix.load(imagePath1);
					this.ui.hintImage1.pixmap = pix;				
					this.ui.hintImage1Label.text = "Select a point you define as\none on the line of symmetry";					
								
					if (this.ui.horizontalRB.checked)
						var imagePath2 = imagePath + "/envelope_h2.png";
					else
						var imagePath2 = imagePath + "/envelope_v2.png";					

					var pix2 = new QPixmap;
					pix2.load(imagePath2);
					this.ui.hintImage2.pixmap = pix2;						
					this.ui.hintImage2Label.text = "If the line is between 2\npoints, select both points";
					this.ui.hintImage2.show();
					this.ui.hintImage2Label.show();	
				}
				else
				{
					this.ui.offsetRB.text = "Mid Point(s)";
					imagePath += "/curve.png";
					this.ui.hintImage1Label.text = "Open Envelope Deformer Selected\n";
					var pix = new QPixmap;
					pix.load(imagePath);
					this.ui.hintImage1.pixmap = pix;
					this.ui.hintImage2.hide();
					this.ui.hintImage2Label.hide();		
				}

			}
			
			if (this.ui.symmetryRB.checked)
			{
				this.ui.directBox.show();
				
				if (this.ui.verticalRB.checked)
				{
					this.ui.rightRB.text = "Top";
					this.ui.leftRB.text = "Bottom";					
				}
				else	
				{
					this.ui.rightRB.text = "Right";
					this.ui.leftRB.text = "Left";							
				}
			}
			else
				this.ui.directBox.hide();
		}
	}
	
	// list of functions called when user interact
	this.selectionChanged = function()
	{
		this.refreshSelection();
		this.setAvailability();
	}
	this.applyButtonReleased = function()
	{
		this.applyTransformation();
		this.refreshSelection();
	}
	this.closeButtonReleased = function()
	{
		pf.savePref(this.ui);			
		this.ui.close();
	}

	// load UI
	this.ui = pf.createUI();
	
	/* if software version is 16 or higher, use SCN class to signal when selection is changed.
	else, use QWidget::changeEvent instead */
	var main = this;
	var softwareVer = pf.getSoftwareVer();		
	if (softwareVer >= 16)
	{
		var scn = new SceneChangeNotifier(this.ui);
		scn.selectionChanged.connect(this, this.selectionChanged);
	}
	else
	{
		this.ui.changeEvent = function()
		{
			if (!main.ui.isActiveWindow)
			{			
				main.ui.modeBox.enabled = false;
				main.ui.axisBox.enabled = false;
				main.ui.originBox.enabled = false;			
				main.ui.restingCB.enabled = false;
				main.ui.applyButton.enabled = false;

				var imagePath = specialFolders.userScripts;
				if (imagePath == undefined)
					imagePath = pf.getUserScriptPath();
				
				imagePath += "/script-icons/Flip_Symmetrize_Deformation";			
				imagePath += "/deformation.png";
				var pix = new QPixmap;
				pix.load(imagePath);
				main.ui.hintImage1.pixmap = pix;			
				main.ui.hintImage1Label.text = "Select a point on a deformer and\nthen select this dialog to continue";
				main.ui.hintImage2.hide();
				main.ui.hintImage2Label.hide();					
			}
			else
				main.selectionChanged();
		}
	}	
	this.ui.closeEvent = function()    // when title bar "x" is clicked
	{
		main.closeButtonReleased();	
	}

	this.ui.mirrorRB.toggled.connect(this, this.setAvailability);
	this.ui.flipRB.toggled.connect(this, this.setAvailability);
	this.ui.symmetryRB.toggled.connect(this, this.setAvailability);

	this.ui.verticalRB.toggled.connect(this, this.setAvailability);
	this.ui.horizontalRB.toggled.connect(this, this.setAvailability);

	this.ui.centroidRB.toggled.connect(this, this.setAvailability);
	this.ui.originRB.toggled.connect(this, this.setAvailability);
	this.ui.offsetRB.toggled.connect(this, this.setAvailability);

	this.ui.rightRB.toggled.connect(this, this.setAvailability);
	this.ui.leftRB.toggled.connect(this, this.setAvailability);
	
	this.ui.applyButton.released.connect(this, this.applyButtonReleased);	

	
	this.applyTransformation = function()
	{
		pref.mode = "mirror";
		if (this.ui.flipRB.checked)
			pref.mode = "flip";
		else if (this.ui.symmetryRB.checked)
			pref.mode = "symmetry";
	
		pref.axis = "horizontal";
		if (this.ui.verticalRB.checked)
			pref.axis = "vertical";	

		pref.fulcrum = "origin";
		if (this.ui.centroidRB.checked)
			pref.fulcrum = "centroid";
		if (this.ui.offsetRB.checked)
			pref.fulcrum = "offset";

		pref.applyTo = "topRight";
		if (this.ui.leftRB.checked)
			pref.applyTo = "bottomLeft";

		pref.reset = false;	
		if (this.ui.restingCB.checked)
			pref.reset = true;			
		
		if (pref.operation == "bone" || pref.operation == "curve")
			pf.setBoneAndCurve(defNodes, numNodes, pref);

		else if (pref.operation == "closedEnvelope")			
			pf.setClosedEnvelope(defNodes, apexIdx, pref);	

		else if (pref.operation == "openEnvelope")
			pf.setOpenEnvelope(defNodes, pref);
			
		else
			return;
	}
}









function private_functions()
{
	this.loadPref = function()	
	{
		var userPref;		
		var localPath = specialFolders.userScripts;
		if (localPath == undefined)
			localPath = this.getUserScriptPath();
		
		localPath += "/YU_Script_Prefs/DEF_Flip_Symmetrize_Deformation_pref.json";
		var file = new File(localPath);
		
		try
		{
			if (file.exists)
			{	
				file.open(1) // read only
				var savedData = file.read();
				file.close();
				userPref = JSON.parse(savedData);				
			}
		}
		catch(err){}			
		
		if (userPref == null)
		{	
			var prefs = {};
			prefs.mirrorBool = true;
			prefs.flipBool = false;
			prefs.symmetryBool = false;
			prefs.veticalBool = false;
			prefs.horizontalBool = true;
			prefs.centroidBool = false;			
			prefs.originBool = true;
			prefs.offsetBool = false;	
			prefs.rightBool = false;
			prefs.leftBool = true;			
			prefs.x = 300;
			prefs.y = 200;
					
			userPref = prefs;
		}
		return userPref;
	};
	

	this.savePref = function(main)
	{	
		var prefs = {};			
		prefs.mirrorBool = main.mirrorRB.checked;
		prefs.flipBool = main.flipRB.checked;
		prefs.symmetryBool = main.symmetryRB.checked;
		prefs.veticalBool = main.verticalRB.checked;
		prefs.horizontalBool = main.horizontalRB.checked;
		prefs.centroidBool = main.centroidRB.checked;
		prefs.originBool = main.originRB.checked;
		prefs.offsetBool = main.offsetRB.checked;
		prefs.rightBool = main.rightRB.checked;
		prefs.leftBool = main.leftRB.checked;				
		prefs.x = main.x;
		prefs.y = main.y;
	
		var localPath = specialFolders.userScripts;	
		if (localPath == undefined)
			localPath = this.getUserScriptPath();

		localPath += "/YU_Script_Prefs";
		var dir = new Dir;
		if (!dir.fileExists(localPath))
			dir.mkdir(localPath);
			
		localPath += "/DEF_Flip_Symmetrize_Deformation_pref.json";	
		var file = new File(localPath);
		
		try
		{	
			file.open(2); // write only
			file.write(JSON.stringify(prefs));
			file.close();
		}
		catch(err){}
	};	

	
	this.findFirstNode = function(apex, numSubNodes)
	{
		// find the first node of the chain (offset or bone)
		var curNode = apex[0];
		for (var n = 0; n < numSubNodes; n++)
		{
			var src = node.srcNode(curNode, 0);
			var srcNodeType = node.type(src);
			if (srcNodeType !== "BendyBoneModule" && srcNodeType !== "CurveModule" && srcNodeType !== "OffsetModule")
				break;
			
			curNode = src;
		}
		return curNode;
	};
	
	
	this.getNodesInOrder = function(curNode, numSubNodes)
	{		
		var defNodes = {};
		defNodes[0] = {};
		var nodeType = node.type(curNode);	
		for (var n = 0; n < numSubNodes; n++)
		{
			if (nodeType == "BendyBoneModule" || nodeType == "CurveModule" || nodeType == "OffsetModule")
			{
				defNodes[n] = {};
				defNodes[n]["node"] = curNode;
				defNodes[n]["type"] = nodeType;	

				if (n > 0 && nodeType == "OffsetModule")		
					defNodes[n]["pre"] = defNodes[n -1].node;
			
				curNode = node.dstNode(curNode, 0, 0);
				nodeType = node.type(curNode);
				if (nodeType == "BendyBoneModule" || nodeType == "CurveModule" || nodeType == "OffsetModule")
					defNodes[n]["next"] = curNode;

				continue;
			}
			else   // reached bottom
			{			
				if (defNodes[0].type == "CurveModule")					
					defNodes[n -1]["next"] = defNodes[0].node;

				else(defNodes[0].type == "OffsetModule")
				{
					defNodes[n -1]["next"] = defNodes[1].node;
					defNodes[0]["pre"] = defNodes[n -1].node;
					break;					
				}
			}
		}
		return defNodes;		
	};

	
	this.getApexIdx = function(apex, defNodes)
	{
		var apexIdx = [];
		for (var idx in defNodes)
		{
			for (var a in apex)
			{
				var idxInt = eval(idx);
				if (defNodes[idxInt].node == apex[a])
					apexIdx.push(idxInt);
			}
		}
		// if 2 apexes are selected, determine which one is on wing0 side
		// toss wing0 side apex first and then wing1 side apex second
		if (apexIdx.length > 1)
		{
			var minApexIdx = Math.min.apply(null, apexIdx);
			var maxApexIdx = Math.max.apply(null, apexIdx);	
			if (minApexIdx +1 == maxApexIdx)
				return [maxApexIdx, minApexIdx];	

			else
				return [minApexIdx, maxApexIdx];					

		}
		return [apexIdx[0]];
	};

	
	this.setOpenEnvelope = function(defNodes, pref)
	{
		var f = frame.current();
		var numNodes = Object.keys(defNodes).length;		
		var numNodePairs = Math.floor(numNodes /2);
		
		if (pref.mode !== "flip")
		{
			// define wing0, and 1 nodes by tossing nodes in sequence from both ends
			var wing0 = [];	
			for (var n = 0; n < numNodePairs; n++)
				wing0.push(defNodes[n]);

			var wing1 = [];
			for (var n = numNodes -1; n >= numNodes - numNodePairs; n--)
				wing1.push(defNodes[n]);
			
			var extent = this.getExtent(defNodes, numNodes, wing0, wing1, remainder, f);
			pref.bottom = extent.bottom;
			pref.left = extent.left;
		}
		var remainder = null;
		if (numNodes %2 == 1)
			remainder = defNodes[numNodePairs];
		
		// if transforming from midpoint, get offset value
		var offsetVal = 0;	
		if (pref.fulcrum == "offset")
		{
			var midpointIdx = [numNodePairs];			
			if (remainder == null)				
				midpointIdx.push(numNodePairs -1);
				
			offsetVal = this.getOffsetVal(defNodes, midpointIdx, f, pref);
		}
		else if (pref.fulcrum == "centroid")
		{
			// find the average of extreme pos
			var averageCenter = this.averageOfExtremePos(defNodes, f, numNodes, pref);		
			switch (pref.axis)
			{				
				case "horizontal": offsetVal = averageCenter.x *2; break;
				case "vertical": offsetVal = averageCenter.y *2; break;
			}	
		}
				
		scene.beginUndoRedoAccum("Flip-Symmetrize Deformation");
		
		
		if (pref.mode == "symmetry")
		{
			// offset all points to screen center first
			if (pref.fulcrum !== "origin")
			{
				for (var n = 0; n < numNodes; n++)		
					this.offsetToCenter(defNodes[n].node, f, pref, offsetVal);
			}
			
			for (var n = 0; n < numNodePairs; n++)
				this.swapPoints(defNodes[n], defNodes[numNodes -n -1], f, pref);

			if (remainder !== null)	
				this.swapSelfHandlePos(remainder, f, wing1, pref);	
		}
		else if (pref.mode == "flip")
			this.flipEnvelope(defNodes, f, pref);

		else  // pref.mode == "mirror"
		{
			var operation = "";
			if (extent.vector == "horizontal" && pref.axis == "horizontal")
				operation = "WE_horizontal";    // shape spans W-E, horizontal flip

			else if (extent.vector == "horizontal" && pref.axis == "vertical") 
				operation = "WE_vertical";      // shape spans W-E, vertical flip

			else if (extent.vector == "vertical" && pref.axis == "vertical") 
				operation = "NS_vertical";      // shape spans N-S, vertical flip			
		
			else
				operation = "NS_horizontal";    // shape spans N-S, horizontal flip			
					
			if (operation == "WE_horizontal" || operation == "NS_vertical") 
			{
				for (var n = 0; n < numNodePairs; n++)				
					this.swapPoints(defNodes[n], defNodes[numNodes -n -1], f, pref);	

				if (remainder !== null)
					this.swapSelfHandlePos(remainder, f, wing1, pref);
			}
			else			
				this.flipEnvelope(defNodes, f, pref);
		}

		// apply OG offset pos to the current shape. also copy values to resting
		if (pref.reset || pref.fulcrum !== "origin")
		{
			var attr = "offset.x";
			if (pref.axis == "vertical")
				attr = "offset.y";
			for (var n = 0; n < numNodes; n++)
			{
				if (pref.fulcrum !== "origin")
				{
					var val = node.getAttr(defNodes[n].node, f, attr).doubleValue();
					switch (pref.mode)
					{				
						case "symmetry": this.addKeyframe(defNodes[n].node, attr, f, val + offsetVal /2, pref); break;
						default: this.addKeyframe(defNodes[n].node, attr, f, val + offsetVal, pref); break;
					}						
				}				
				if (pref.reset)
					this.applyToResting(defNodes[n].node, f);
			}
		}
		
		scene.endUndoRedoAccum();		
	};
	
	
	this.setClosedEnvelope = function(defNodes, apexIdx, pref)
	{
		var f = frame.current();		
		var numNodes = Object.keys(defNodes).length;	

		if (pref.mode !== "flip")
		{
			var checkedNode = [defNodes[numNodes -1].node /* jointNode */];
			var numApex = apexIdx.length;		
			if (numApex == 1)
				checkedNode.push(defNodes[apexIdx[0]].node);

			// num of nodes belong to each wing of the shape
			var numCommonNodes = (numNodes -checkedNode.length);		
			var maxNum = Math.floor(numCommonNodes /2);
			
			//repeat defNodes array once to avoid items from running out
			for (var idx = numNodes; idx < numNodes*2; idx++)
			{
				var ref = defNodes[idx - numNodes];
				defNodes[idx] = {};
				defNodes[idx]["node"] = ref.node;
				defNodes[idx]["type"] = ref.type;		
				if ("pre" in ref)
					defNodes[idx]["pre"] = ref.pre;
				if ("next" in ref)
					defNodes[idx]["next"] = ref.next;			
			}
			
			// starting from startIdx node , separate found nodes into two wing arrays
			var startIdx = apexIdx[0] +1;		
			if (numApex > 1)
			{
				var startIdx = apexIdx[0];
				// add wing2 side apex to checkedNode so it can be added at the end
				checkedNode.push(defNodes[apexIdx[1]].node);
			}
			var wing0 = [], wing1 = [];
			var remainder = null;		
			for (var n = startIdx; n < Object.keys(defNodes).length; n++)
			{
				// pick up wing0 nodes until reach maxNum
				if (wing0.length < maxNum)
				{
					if (checkedNode.indexOf(defNodes[n].node) == -1)
					{
						wing0.push(defNodes[n]);
						checkedNode.push(defNodes[n].node);
					}
				}
				else
				{
					// if total of common nodes == odd, define the extra node as remainder				
					if (numCommonNodes %2 == 1 && remainder == null) 
					{
						if (checkedNode.indexOf(defNodes[n].node) == -1)
						{
							remainder = defNodes[n];
							checkedNode.push(defNodes[n].node);
							n++;
						}	
					}
					// pick up wing1 nodes until reach maxNum
					if (wing1.length < maxNum)	
					{
						if (checkedNode.indexOf(defNodes[n].node) == -1)
						{	
							wing1.push(defNodes[n]);
							checkedNode.push(defNodes[n].node);						
						}
						if (numApex > 1 && wing1.length +1 == maxNum )
							wing1.push(defNodes[apexIdx[1]]);
					}
					else
						break;
				}
			}
			// find the vector and orientation of the entire shape
			var extent = this.getExtent(defNodes, numNodes, wing0, wing1, remainder, f);
			pref.bottom = extent.bottom;
			pref.left = extent.left;
		}
		
		var offsetVal = 0;		
		if (pref.fulcrum == "offset")
			offsetVal += this.getOffsetVal(defNodes, apexIdx, f, pref);

		else if (pref.fulcrum == "centroid")
		{
			// find the average of extreme pos
			var averageCenter = this.averageOfExtremePos(defNodes, f, numNodes, pref);		
			switch (pref.axis)
			{				
				case "horizontal": offsetVal += averageCenter.x *2; break;
				case "vertical": offsetVal += averageCenter.y *2; break;
			}	
		}		

		scene.beginUndoRedoAccum("Flip-Symmetrize Deformation");

	
		if (pref.mode == "flip")
			this.flipEnvelope(defNodes, f, pref);

		else
		{
			// offset all points to screen center first			
			if (pref.fulcrum !== "origin")
			{
				for (var n = 0; n < numNodes; n++)		
					this.offsetToCenter(defNodes[n].node, f, pref, offsetVal);
			}

			if (numApex == 1)
				this.swapSelfHandlePos(defNodes[apexIdx[0]], f, wing1, pref);
		
			if (remainder !== null)
				this.swapSelfHandlePos(remainder, f, wing1, pref);
			
			for (var w = 0; w < wing0.length; w++)		
				this.swapPoints(wing0[w], wing1[wing1.length -1 -w], f, pref);
		}
		
		// apply OG offset pos to the current shape. also copy values to resting
		if (pref.reset || pref.fulcrum !== "origin")
		{
			var attr = "offset.x";
			if (pref.axis == "vertical")
			{	attr = "offset.y";	}

			for (var n = 0; n < numNodes; n++)
			{
				if (pref.fulcrum !== "origin")
				{
					var val = node.getAttr(defNodes[n].node, f, attr).doubleValue();

					switch (pref.mode)
					{				
						case "flip": this.addKeyframe(defNodes[n].node, attr, f, val + offsetVal, pref); break;
						default: this.addKeyframe(defNodes[n].node, attr, f, val + offsetVal /2, pref); break;
					}						
				}				
				if (pref.reset)
					this.applyToResting(defNodes[n].node, f)	
			}
		}
		
		scene.endUndoRedoAccum();	
	};

	
	this.flipEnvelope = function(defNodes, f, pref)
	{		
		var f = frame.current();		
		var numNodes = Object.keys(defNodes).length;
					
		var attr = "offset.x"
		var attr2 = "offset.y"					
		var rotate180 = false;
		
		if (pref.axis == "vertical")
		{
			attr = "offset.y"
			attr2 = "offset.x"					
			rotate180 = true;					
		}
							
		for (var n = 0; n < numNodes; n++)
		{
			var pos1 = node.getAttr(defNodes[n].node, f, attr).doubleValue();
			var pos2 = node.getAttr(defNodes[n].node, f, attr2).doubleValue();				
			this.addKeyframe(defNodes[n].node, attr, f, -pos1, pref);
			this.addKeyframe(defNodes[n].node, attr2, f, pos2, pref);
			
			var nodeType = node.type(defNodes[n].node);			
			if (nodeType == "CurveModule")
			{					
				var orient0 = node.getAttr(defNodes[n].node, f, "orientation0").doubleValue();												
				var projection0 = this.getProjectedAngle(orient0, rotate180);
				var flipped0 = this.getMinDistanceToProjection(orient0, projection0);
				this.addKeyframe(defNodes[n].node, "orientation0", f, flipped0, pref);
				
				var orient1 = node.getAttr(defNodes[n].node, f, "orientation1").doubleValue();	
				var projection1 = this.getProjectedAngle(orient1, rotate180);
				var flipped1 = this.getMinDistanceToProjection(orient1, projection1);
				this.addKeyframe(defNodes[n].node, "orientation1", f, flipped1, pref);			
				
				// set keys as is
				var length0 = node.getAttr(defNodes[n].node, f, "length0").doubleValue();
				var length1 = node.getAttr(defNodes[n].node, f, "length1").doubleValue();
				this.addKeyframe(defNodes[n].node, "length0", f, length0, pref);
				this.addKeyframe(defNodes[n].node, "length1", f, length1, pref);			
			}
			else   	// offset nodes
			{						
				var orient = node.getAttr(defNodes[n].node, f, "orientation").doubleValue();
				var flippedOriernt = this.getProjectedAngle(orient, rotate180);
				this.addKeyframe(defNodes[n].node, "orientation", f, flippedOriernt, pref);
			}					
		}	
	};

	
	this.setBoneAndCurve = function(defNodes, numNodes, pref)
	{
		scene.beginUndoRedoAccum("Flip Curve and Bone Deformation");		
		
		
		var f = frame.current();		
		var isFirstBone = true;
				
		for (var n = 0; n < numNodes; n++)
		{
			if (defNodes[n].type == "OffsetModule")
			{
				switch (pref.axis)
				{				
					case "horizontal": this.flipBoneAndCurve(defNodes[n], "offset.x", f, true, pref); break;
					case "vertical": this.flipBoneAndCurve(defNodes[n], "offset.y", f, false, pref); break;
				}			
			}
			else if (defNodes[n].type == "CurveModule")
			{
				switch (pref.axis)
				{				
					case "horizontal": this.flipBoneAndCurve(defNodes[n], "offset.y", f, false, pref); break;
					case "vertical": this.flipBoneAndCurve(defNodes[n], "offset.y", f, true, pref); break;
				}				
			}
			else if (defNodes[n].type == "BendyBoneModule")
			{
				if (isFirstBone)    // first "offset" bone
				{
					switch (pref.axis)
					{				
						case "horizontal": this.flipBoneAndCurve(defNodes[n], "offset.x", f, true, pref, isFirstBone); break;
						case "vertical": this.flipBoneAndCurve(defNodes[n], "offset.y", f, false, pref, isFirstBone); break;
					}								
					isFirstBone = false;
				}
				else				// second bone and after
				{
					switch (pref.axis)
					{				
						case "horizontal": this.flipBoneAndCurve(defNodes[n], "offset.x", f, false, pref, isFirstBone); break;
						case "vertical": this.flipBoneAndCurve(defNodes[n], "offset.y", f, false, pref, isFirstBone); break;
					}												
				}
			}
			
			if (pref.reset)
			{
				this.applyToResting(defNodes[n].node, f)			
			}					
		}
	
	
		scene.endUndoRedoAccum("");		
	};
	
	
	this.flipBoneAndCurve = function(nodeObj, attr, f, rotate180, pref, isFirstBone)
	{
		// set the other position key with the value as is
		var attr2 = "offset.x";
		if (attr == attr2)
			attr2 = "offset.y"
		var pos2 = node.getAttr(nodeObj.node, f, attr2).doubleValue();
		this.addKeyframe(nodeObj.node, attr2, f, pos2, pref);
		
		if (nodeObj.type == "CurveModule")     // curve mode curve nodes
		{
			var pos1 = node.getAttr(nodeObj.node, f, attr).doubleValue();		
			this.addKeyframe(nodeObj.node, attr, f, -pos1, pref);			
			
			var orient0 = node.getAttr(nodeObj.node, f, "orientation0").doubleValue();
			var orient1 = node.getAttr(nodeObj.node, f, "orientation1").doubleValue();				
			this.addKeyframe(nodeObj.node, "orientation0",  f, -orient0, pref);
			this.addKeyframe(nodeObj.node, "orientation1", f, -orient1, pref);								
			
			// set keys as is
			var length0 = node.getAttr(nodeObj.node, f, "length0").doubleValue();
			var length1 = node.getAttr(nodeObj.node, f, "length1").doubleValue();
			this.addKeyframe(nodeObj.node, "length0", f, length0, pref);
			this.addKeyframe(nodeObj.node, "length1", f, length1, pref);			
		}
		else   								// bone and offset nodes
		{
			var pos1 = node.getAttr(nodeObj.node, f, attr).doubleValue();
			if (pref.fulcrum == "offset")
			{
				if (isFirstBone || nodeObj.type == "OffsetModule")
					this.addKeyframe(nodeObj.node, attr, f, pos1, pref);
			}
			else
				this.addKeyframe(nodeObj.node, attr, f, -pos1, pref);	
			
			var orient = node.getAttr(nodeObj.node, f, "orientation").doubleValue();
			var flippedOriernt = this.getProjectedAngle(orient, rotate180);
			this.addKeyframe(nodeObj.node, "orientation", f, flippedOriernt, pref);			
			
			if (nodeObj.type == "BendyBoneModule")
			{
				// set keys as is
				var radius = node.getAttr(nodeObj.node, f, "radius").doubleValue();
				var bias = node.getAttr(nodeObj.node, f, "bias").doubleValue();
				var length = node.getAttr(nodeObj.node, f, "length").doubleValue();
				this.addKeyframe(nodeObj.node, "radius", f, radius, pref);
				this.addKeyframe(nodeObj.node, "bias", f, bias, pref);
				this.addKeyframe(nodeObj.node, "length", f, length, pref);			
			}
		}
	};

	
	this.swapSelfHandlePos = function(nodeObj, f, wing1, pref)
	{
		var applyToPrimal = true, applyToOpposite = true; 
		if (pref.mode == "symmetry")
		{
			applyToPrimal = this.boolApplyPrimal(pref);
			if (applyToPrimal) 
				applyToOpposite = false;
		}
		
		// ------------------------------------ points ------------------------------------>
		
		var attr = "offset.x";
		var rotate180 = true;
		if (pref.axis == "vertical")
		{
			rotate180 = false;
			attr = "offset.y";
		}

		var pos1 = node.getAttr(nodeObj.node, f, attr).doubleValue();
		switch (pref.mode)
		{				
			case "symmetry": this.addKeyframe(nodeObj.node, attr, f, 0, pref); break;
			default : this.addKeyframe(nodeObj.node, attr, f, -pos1, pref); break;
		}
		
		// set keys as is
		var attr2 = "offset.x";
		if (attr == attr2)
			attr2 = "offset.y";
		var pos2 = node.getAttr(nodeObj.node, f, attr2).doubleValue();
		this.addKeyframe(nodeObj.node, attr2, f, pos2, pref);
			
		if (nodeObj.type == "OffsetModule")
		{
			var orient = node.getAttr(nodeObj.node, f, "orientation").doubleValue();
			this.addKeyframe(nodeObj.node, "orientation", f, orient, pref);			
		}		
		
		// ------------------------------------ handles ------------------------------------>

		var orient0attr = "orientation0";
		var orient1attr = "orientation1";
		var length0attr = "length0";
		var length1attr = "length1";		
		var handle0Node = nodeObj.next;
		var handle1Node = nodeObj.node;
		
		function swapAttrs()
		{
			orient0attr = "orientation1";
			orient1attr = "orientation0";
			length0attr = "length1";
			length1attr = "length0";  				
			handle0Node = nodeObj.node;	
			handle1Node = nodeObj.next;
			if (nodeObj.type == "OffsetModule")
				handle0Node = nodeObj.pre;
		}	

		if (nodeObj.type == "OffsetModule")
			handle1Node = nodeObj.pre;
		
		if (pref.mode == "symmetry")
		{			
			for (var w = 0; w < wing1.length; w++)
			{		
				if (wing1[w].node == nodeObj.next)
				{
					swapAttrs();
					break;
				}
				else if (wing1[w].type == "OffsetModule" && wing1[w].pre == nodeObj.next)
				{
					swapAttrs();
					break;
				}
			}
		}

		var orient0 = node.getAttr(handle0Node, f, orient0attr).doubleValue();
		var orient1 = node.getAttr(handle1Node, f, orient1attr).doubleValue();
		var length0 = node.getAttr(handle0Node, f, length0attr).doubleValue();
		var length1 = node.getAttr(handle1Node, f, length1attr).doubleValue();		

		if (applyToOpposite)
		{
			var projection0 = this.getProjectedAngle(orient1, rotate180);
			var flipped0 = this.getMinDistanceToProjection(orient0, projection0);
			this.addKeyframe(handle0Node, orient0attr, f, flipped0, pref);
			this.addKeyframe(handle0Node, length0attr, f, length1, pref);			
		}
		else
		{
			// set keys as is
			var orient0_2 = node.getAttr(handle0Node, f, "orientation0").doubleValue();
			var length0_2 = node.getAttr(handle0Node, f, "length0").doubleValue();		
			this.addKeyframe(handle0Node, "orientation0", f, orient0_2, pref);
			this.addKeyframe(handle0Node, "length0", f, length0_2, pref);			
		}
	
		if (applyToPrimal)
		{		
			var projection1 = this.getProjectedAngle(orient0, rotate180);			
			var flipped1 = this.getMinDistanceToProjection(orient1, projection1);				
			this.addKeyframe(handle1Node, orient1attr, f, flipped1, pref);
			this.addKeyframe(handle1Node, length1attr, f, length0, pref);			
		}
		else
		{
			// set keys as is
			var orient1_2 = node.getAttr(handle1Node, f, "orientation1").doubleValue();
			var length1_2 = node.getAttr(handle1Node, f, "length1").doubleValue();				
			this.addKeyframe(handle1Node, "orientation1", f, orient1_2, pref);
			this.addKeyframe(handle1Node, "length1", f, length1_2, pref);			
		}	
	};

	
	this.swapPoints = function(prime, opp, f, pref)
	{
		var applyToPrimal = true, applyToOpposite = true; 
		if (pref.mode == "symmetry")
		{
			applyToPrimal = this.boolApplyPrimal(pref);
			if (applyToPrimal)
				applyToOpposite = false;
		}
	
		// ------------------------------------ points ------------------------------------>

		var primeX = node.getAttr(prime.node, f, "offset.x").doubleValue();	
		var primeY = node.getAttr(prime.node, f, "offset.y").doubleValue();			
		var oppX = node.getAttr(opp.node, f, "offset.x").doubleValue();
		var oppY = node.getAttr(opp.node, f, "offset.y").doubleValue();			
		var rotate180 = true;

		if (applyToPrimal)
		{
			// primary point			
			switch (pref.axis)
			{			
				case "horizontal" : this.addKeyframe(opp.node, "offset.x", f, -primeX, pref);
									this.addKeyframe(opp.node, "offset.y", f, primeY, pref); break;
																		
				case "vertical"   : this.addKeyframe(opp.node, "offset.x", f, primeX, pref);
									this.addKeyframe(opp.node, "offset.y", f, -primeY, pref);									
									rotate180 = false; break;
			}
		}
		else
		{
			// set keys as is
			this.addKeyframe(opp.node, "offset.x", f, oppX, pref);
			this.addKeyframe(opp.node, "offset.y", f, oppY, pref);	
			
		}
	
		if (applyToOpposite)
		{		
			// opposite point
			switch (pref.axis)
			{
				case "horizontal" : this.addKeyframe(prime.node, "offset.x", f, -oppX, pref);
									this.addKeyframe(prime.node, "offset.y", f, oppY, pref); break;
																		
				case "vertical"   : this.addKeyframe(prime.node, "offset.x", f, oppX, pref);
									this.addKeyframe(prime.node, "offset.y", f, -oppY, pref);		
									rotate180 = false; break;
			}
		}
		else
		{
			// set keys as is
			this.addKeyframe(prime.node, "offset.x", f, primeX, pref);
			this.addKeyframe(prime.node, "offset.y", f, primeY, pref);			
		}

		
		// ------------------------------------ handles ------------------------------------>

		
		var prime0Node = prime.next;
		var prime1Node = prime.node;
		var opp0Node = opp.next;
		var opp1Node = opp.node;
		
		// for symmetrizing end points on open envelope
		if (pref.mode == "symmetry" && pref.operation == "openEnvelope" && prime.type == "OffsetModule")
		{
			var primeOrient0 = node.getAttr(prime0Node, f, "orientation0").doubleValue();
			var primeLength0 = node.getAttr(prime0Node, f, "length0").doubleValue();
			var oppOrient1 = node.getAttr(opp1Node, f, "orientation1").doubleValue();				
			var oppLength1 = node.getAttr(opp1Node, f, "length1").doubleValue();	
			
			if (applyToPrimal)
			{	
				this.angleSwap(opp1Node, oppOrient1, primeOrient0, f, "orientation1", rotate180, pref);				
				this.addKeyframe(opp1Node, "length1", f, primeLength0, pref);

				// set keys as is
				this.addKeyframe(prime0Node, "orientation0", f, primeOrient0, pref);
				this.addKeyframe(prime0Node, "length0", f, primeLength0, pref);		
			}
			else
			{			
				this.angleSwap(prime0Node, primeOrient0, oppOrient1, f, "orientation0", rotate180, pref);		
				this.addKeyframe(prime0Node, "length0", f, oppLength1, pref);

				// set keys as is
				this.addKeyframe(opp1Node, "orientation1", f, oppOrient1, pref);
				this.addKeyframe(opp1Node, "length1", f, oppLength1, pref);				
			}
		}
		else
		{
			if (prime.type == "OffsetModule")
				prime1Node = prime.pre;
		
			if (opp.type == "OffsetModule")
				opp1Node = opp.pre;
			
			var primeOrient0 = node.getAttr(prime0Node, f, "orientation0").doubleValue();
			var primeOrient1 = node.getAttr(prime1Node, f, "orientation1").doubleValue();			
			var primeLength0 = node.getAttr(prime0Node, f, "length0").doubleValue();
			var primeLength1 = node.getAttr(prime1Node, f, "length1").doubleValue();			
			var oppOrient1 = node.getAttr(opp1Node, f, "orientation1").doubleValue();				
			var oppLength1 = node.getAttr(opp1Node, f, "length1").doubleValue();				
			var oppOrient0 = node.getAttr(opp0Node, f, "orientation0").doubleValue();
			var oppLength0 = node.getAttr(opp0Node, f, "length0").doubleValue();				
			
			if (applyToPrimal)
			{				
				// opposite handle orientation	
				this.angleSwap(opp0Node, oppOrient0, primeOrient1, f, "orientation0", rotate180, pref);
				this.angleSwap(opp1Node, oppOrient1, primeOrient0, f, "orientation1", rotate180, pref);				
				
				// opposite handle length
				this.addKeyframe(opp0Node, "length0", f, primeLength1, pref);
				this.addKeyframe(opp1Node, "length1", f, primeLength0, pref);			
			}
			else
			{
				// set keys as is
				this.addKeyframe(opp0Node, "orientation0", f, oppOrient0, pref);
				this.addKeyframe(opp1Node, "orientation1", f, oppOrient1, pref);
				this.addKeyframe(opp0Node, "length0", f, oppLength0, pref);
				this.addKeyframe(opp1Node, "length1", f, oppLength1, pref);			
			}
			
			if (applyToOpposite)
			{		
				// primary handle orientation
				this.angleSwap(prime0Node, primeOrient0, oppOrient1, f, "orientation0", rotate180, pref);
				this.angleSwap(prime1Node, primeOrient1, oppOrient0, f, "orientation1", rotate180, pref);
				
				// primary handle length		
				this.addKeyframe(prime0Node, "length0", f, oppLength1, pref);
				this.addKeyframe(prime1Node, "length1", f, oppLength0, pref);			
			}
			else
			{
				// set keys as is
				this.addKeyframe(prime0Node, "orientation0", f, primeOrient0, pref);
				this.addKeyframe(prime1Node, "orientation1", f, primeOrient1, pref);
				this.addKeyframe(prime0Node, "length0", f, primeLength0, pref);
				this.addKeyframe(prime1Node, "length1", f, primeLength1, pref);
			}
		}
	};

	
	this.angleSwap = function(argNode, argVal, refVal, f, attr, rotate180, pref)
	{
		var projection = this.getProjectedAngle(refVal, rotate180);
		var flipped = this.getMinDistanceToProjection(argVal, projection);
		this.addKeyframe(argNode, attr, f, flipped, pref);
	};


	this.addKeyframe = function(argNode, attr, f, val, pref)
	{
		var col = node.linkedColumn(argNode, attr);
		if (col == "")
		{
			col = this.getUniqueColName(attr);
			var success = column.add(col, "BEZIER");
			node.linkAttr(argNode, attr, col);
		}
		else if (pref.reset)
			for (var pt = func.numberOfPoints(col) -1; pt >= 0; pt--)
				column.clearKeyFrame(col, func.pointX(col, pt));	
			
		var setFrame = (pref.reset) ? 1 : f;		
		column.setEntry (col, 0, setFrame, val.toFixed(20));
	};
	
	
	this.getUniqueColName = function(argName)
	{
		var suffix = 0;
		var originalName = argName;
 
		var colList = [];
		for (var i = 0; i < column.numberOf(); i++)
			colList.push(column.getName(i));

		while (colList.indexOf(argName) !== -1)
		{
			suffix ++;
			argName = originalName + "_" + suffix;	
		}	
		return argName;
	};

	
	this.getMinDistanceToProjection = function(original, projection)
	{
		// count how many 360 can fit in the value difference
		var m = 0;
		var difference = Math.abs(projection - original);  
		if (!isNaN(difference))
		{
			while (360 *m < Math.abs(difference))
			{m++}
		}

		// there are also 180 degree of difference between handle0 and handle1
		// determine whether projection +180 or -180 is closer to the original value
		var add = Math.abs(projection +180 - original);
		var sub = Math.abs(projection -180 - original);
		if (add < sub)
			projection += 180;
		else
			projection -= 180;   

		// find an isophase of projection closest to original value
		var array = [], array2 = [];
		array.push(projection); 
		array.push(projection +360 *(m-1));
		array.push(projection +360 *m);	
		array.push(projection -360 *(m-1));
		array.push(projection -360 *m);	
		array2.push(Math.abs(array[0] - original));
		array2.push(Math.abs(array[1] - original));
		array2.push(Math.abs(array[2] - original));
 		array2.push(Math.abs(array[3] - original));
		array2.push(Math.abs(array[4] - original));
		
		var minIdx = 0;
		var minVal = array2[0];
		for (var n = 1; n < array2.length; n++)
		{
			if (array2[n] < minVal)
			{
				minVal = array2[n];
				minIdx = n;
			}
		}
		return array[minIdx];
	};
	
	
	this.getProjectedAngle = function(argVal, rotate180)
	{
		// Equation only works for values between -360 to 360. Any values outside will be normalized:
		var adjustment = this.removeDecimals(argVal /360) *360;
		argVal -= adjustment;
		
		var from0 = argVal %180;		
		var advanceValue = 0;
		
		if (rotate180)
		{
			// Switch the direction of rotation depends on the input's polarity:
			if (argVal >= 0)
				advanceValue = 180;
			else
				advanceValue = -180;
		}		
		var newValue = argVal + advanceValue -(from0 *2);
				
		// Convert the normalized value to actual value:
		return newValue += adjustment;
	};

	
	this.removeDecimals = function(argVal)
	{
		if (argVal >= 0)
			return Math.floor(argVal);
		else
			return Math.floor(argVal)+1;
	};
	
	
	this.boolApplyPrimal = function(pref)
	{
		var keyword = pref.left;
		if (pref.axis == "vertical")
			keyword = pref.bottom;

		if (keyword == "wing0" && pref.applyTo == "topRight")
			return true;				
		else if (keyword == "wing0" && pref.applyTo == "bottomLeft")
			return false;
		else if (keyword == "wing1" && pref.applyTo == "bottomLeft")
			return true;
		else if (keyword == "wing1" && pref.applyTo == "topRight")
			return false;	
	};
	
	
	this.offsetToCenter = function(argNode, f, pref, offsetVal)
	{
		switch (pref.axis)
		{				
			case "horizontal": var attr = "offset.x"; break;
			case "vertical":   var attr = "offset.y"; break;
		}
		
		var col = node.linkedColumn(argNode, attr);
		if (col == "")
		{
			col = this.getUniqueColName(attr);
			var success = column.add(col, "BEZIER");
			node.linkAttr(argNode, attr, col);
		}				
		var val = node.getAttr(argNode, f, attr).doubleValue();

		var setFrame = (pref.reset) ? 1 : f;
		if (pref.reset)
			for (var pt = func.numberOfPoints(col) -1; pt >= 0; pt--)
				column.clearKeyFrame(col, func.pointX(col, pt));

		column.setEntry (col, 0, setFrame, val.toFixed(20) - offsetVal /2);			
	};

	
	this.applyToResting = function(argNode, f)
	{
		var nodeType = node.type(argNode);
		var restAttrs = [], attrs = [];
		switch (nodeType)
		{
			case "BendyBoneModule": restAttrs = ["restoffset.x", "restoffset.y", "restradius",
												  "restorientation", "restbias", "restlength"];
										attrs = ["offset.x", "offset.y", "radius",
												  "orientation", "bias", "length"]; break;
			case "OffsetModule": 	restAttrs = ["restingoffset.x", "restingoffset.y", "restingorientation"];
			
										attrs = ["offset.x", "offset.y", "orientation"]; break;	
										
			case "CurveModule": 	restAttrs = ["restingoffset.x", "restingoffset.y", "restingorientation0",
												  "restlength0", "restingorientation1", "restlength1"];
										attrs = ["offset.x", "offset.y", "orientation0",
												  "length0", "orientation1", "length1"]; break;
		}
		if (attrs.length > 0)
		{
			for (var at = 0; at < attrs.length; at++)
			{
				var val = node.getAttr(argNode, 1, attrs[at]).doubleValue();
				node.setTextAttr(argNode, restAttrs[at], 1, val);
			}
		}
	};


	this.getOffsetVal = function(defNodes, midpointIdx, f, pref)
	{
		var offsetVal = 0;
		var attr = "offset.x";
		if (pref.axis == "vertical")
			attr = "offset.y";		
		
		if (midpointIdx.length == 1)
			offsetVal += node.getAttr(defNodes[midpointIdx[0]].node, f, attr).doubleValue()*2;		

		else
		{
			var offsetVal0 = node.getAttr(defNodes[midpointIdx[0]].node, f, attr).doubleValue();
			var offsetVal1 = node.getAttr(defNodes[midpointIdx[1]].node, f, attr).doubleValue();
			offsetVal += (offsetVal0 + offsetVal1);
		}	
		return offsetVal;	
	};
	

	this.getExtent = function(defNodes, numNodes, wing0, wing1, remainder, f)
	{
		var aspect = scene.unitsAspectRatioX() /scene.unitsAspectRatioY();
		
		// ------------------------------------ orientation ------------------------------------>

		
		// get all points' position from each wings		
		function getPosTotal(array)
		{
			var x = 0, y = 0;
			for (var a = 0; a < array.length; a++)
			{
				x += node.getAttr(array[a].node, f, "offset.x").doubleValue();
				y += node.getAttr(array[a].node, f, "offset.y").doubleValue();						
			}
			y *= aspect;
			return {x: x, y: y}
		}		
		var wing0total = getPosTotal(wing0);
		var wing1total = getPosTotal(wing1);		
		
		// based on the total, get where wings are facing.
		var leftW = "wing0";
		if (wing0total.x > wing1total.x)
			leftW = "wing1";

		var bottomW = "wing0";
		if (wing0total.y > wing1total.y)
			bottomW = "wing1";
		
		
		// ------------------------------------ vector ------------------------------------>	

		
		// find the centroid of shape
		var centroidx = 0, centroidy = 0;			
		for (var n = 0; n < numNodes; n++)
		{
			centroidx += node.getAttr(defNodes[n].node, f, "offset.x").doubleValue();
			centroidy += node.getAttr(defNodes[n].node, f, "offset.y").doubleValue();							
		}
		centroidx /= numNodes; 
		centroidy /= numNodes;		
			
		// get a total of all point's distance from the centroid
		var totalx = 0, totaly = 0;			
		for (var n = 0; n < numNodes; n++)
		{
			var tx = node.getAttr(defNodes[n].node, f, "offset.x").doubleValue();
			totalx += Math.abs(centroidx - tx);
			var ty = node.getAttr(defNodes[n].node, f, "offset.y").doubleValue();			
			totaly += Math.abs(centroidy - ty);				
		}
		totaly *= aspect;
		
		// based on the total, get the vector of the shape
		var vector = "horizontal";
		if (totalx < totaly)
			vector = "vertical";	
	
		return {left: leftW, bottom: bottomW, vector: vector};
	};

	
	this.averageOfExtremePos = function(defNodes, f, numNodes, pref)
	{
		// if shape is closed envelope, exclude the last "joint" node from result
		if (pref.operation == "closedEnvelope")
			numNodes -= 1;

		var posx = [], posy = [];			
		for (var n = 0; n < numNodes; n++)
		{
			posx.push(node.getAttr(defNodes[n].node, f, "offset.x").doubleValue());
			posy.push(node.getAttr(defNodes[n].node, f, "offset.y").doubleValue());							
		}
		var minPosx = Math.min.apply(Math, posx);
		var maxPosx = Math.max.apply(Math, posx);
		var minPosy = Math.min.apply(Math, posy);
		var maxPosy = Math.max.apply(Math, posy);
		
		return {x: (minPosx + maxPosx) /2, y: (minPosy + maxPosy) /2};
	};
	
	
	this.getUserScriptPath = function()
	{
		var softVer = this.getSoftwareVer();
		var path = specialFolders.userConfig;
		pathSplit = path.split("/");
		pathSplit.pop();
		return pathSplit.join("/") + "/" + softVer + "00-scripts";				
	};
	
	
	this.getSoftwareVer = function()
	{
		var info = about.getVersionInfoStr();
		info = info.split(" ");
		return parseFloat(info[7]);
	};
	
	
	this.getParentWidget = function()
	{
		var topWidgets = QApplication.topLevelWidgets();
		for (var i in topWidgets)
			if (topWidgets[i] instanceof QMainWindow && !topWidgets[i].parentWidget())
				return topWidgets[i];
		return "";
	};

	
	this.createUI = function()
	{

		this.dialog = new QWidget(this.getParentWidget());	
		this.dialog.setWindowTitle("Flip-Symmetrize v" + scriptVer);
		this.dialog.setWindowFlags(Qt.Tool);
		this.dialog.setAttribute(Qt.WA_DeleteOnClose);		
		this.dialog.setMinimumSize (305, 370);
		this.dialog.setFocus(true);
		this.dialog.mouseTracking = true;
		
		this.dialog.mainLayout = new QVBoxLayout(this.dialog);
		
		//1st row
		this.dialog.hintLayout = new QGridLayout(this.dialog);	
		
		this.dialog.hintImage1 = new QLabel();
		this.dialog.hintImage1.alignment = (Qt.AlignCenter);
		this.dialog.hintLayout.addWidget(this.dialog.hintImage1, 0, 0);		
		this.dialog.hintImage1Label = new QLabel();
		this.dialog.hintImage1Label.alignment = (Qt.AlignCenter);		
		this.dialog.hintLayout.addWidget(this.dialog.hintImage1Label, 1, 0);				
		this.dialog.hintImage2 = new QLabel();	
		this.dialog.hintImage2.alignment = (Qt.AlignCenter);		
		this.dialog.hintLayout.addWidget(this.dialog.hintImage2, 0, 1);		
		this.dialog.hintImage2Label = new QLabel();	
		this.dialog.hintImage2Label.alignment = (Qt.AlignCenter);		
		this.dialog.hintLayout.addWidget(this.dialog.hintImage2Label, 1, 1);			
		
		// 2nd row
		this.dialog.modeDirectLayout = new QVBoxLayout(this.dialog);	

		this.dialog.modeBox = new QGroupBox("Mode");
		this.dialog.modeBoxLayout = new QHBoxLayout(this.dialog);		
		this.dialog.modeBox.setLayout(this.dialog.modeBoxLayout);	
		this.dialog.modeBox.setMinimumSize (283, 105);		
		this.dialog.modeDirectLayout.addWidget(this.dialog.modeBox, 0, 0);

		this.dialog.modeRBLayout = new QVBoxLayout(this.dialog);			
		this.dialog.modeBoxLayout.addLayout(this.dialog.modeRBLayout);
		
		this.dialog.mirrorRB = new QRadioButton("Mirror");	
		this.dialog.modeRBLayout.addWidget(this.dialog.mirrorRB, 0, 0);
		this.dialog.flipRB = new QRadioButton("Flip");	
		this.dialog.modeRBLayout.addWidget(this.dialog.flipRB, 0, 1);
		this.dialog.symmetryRB = new QRadioButton("Symmetrize");	
		this.dialog.modeRBLayout.addWidget(this.dialog.symmetryRB, 0, 2);
				
		this.dialog.directBox = new QGroupBox("Symmetrize:");
		this.dialog.directBoxLayout = new QVBoxLayout(this.dialog);			
		this.dialog.directBox.setLayout(this.dialog.directBoxLayout);
		this.dialog.modeBoxLayout.addWidget(this.dialog.directBox, 0, 1);

		this.dialog.rightRB = new QRadioButton("Right");	
		this.dialog.directBoxLayout.addWidget(this.dialog.rightRB, 0, 0);		
		this.dialog.leftRB = new QRadioButton("Left");	
		this.dialog.directBoxLayout.addWidget(this.dialog.leftRB, 0, 1);	

		// 3rd row
		this.dialog.axisOriginLayout = new QHBoxLayout(this.dialog);	
		
		this.dialog.axisBox = new QGroupBox("Axis:");
		this.dialog.axisBoxLayout = new QVBoxLayout(this.dialog);		
		this.dialog.axisBox.setLayout(this.dialog.axisBoxLayout);			
		this.dialog.axisBox.setMinimumSize (120, 105);
		this.dialog.axisOriginLayout.addWidget(this.dialog.axisBox, 0, 0);

		this.dialog.verticalRB = new QRadioButton("Vertical");	
		this.dialog.axisBoxLayout.addWidget(this.dialog.verticalRB, 0, 0);
		this.dialog.horizontalRB = new QRadioButton("Horizontal");	
		this.dialog.axisBoxLayout.addWidget(this.dialog.horizontalRB, 0, 1)				
		
		this.dialog.originBox = new QGroupBox("Transform From:");
		this.dialog.originBoxLayout = new QVBoxLayout(this.dialog);			
		this.dialog.originBox.setLayout(this.dialog.originBoxLayout);		
		this.dialog.originBox.setMinimumSize (156, 105);
		this.dialog.axisOriginLayout.addWidget(this.dialog.originBox, 0, 1);

		this.dialog.centroidRB = new QRadioButton("Center of Shape");	
		this.dialog.originBoxLayout.addWidget(this.dialog.centroidRB, 0, 0);
		this.dialog.offsetRB = new QRadioButton("Deformation Offset");	
		this.dialog.originBoxLayout.addWidget(this.dialog.offsetRB, 0, 1);
		this.dialog.originRB = new QRadioButton("Scene Origin (0, 0)");	
		this.dialog.originBoxLayout.addWidget(this.dialog.originRB, 0, 2);		
	
		// 4th row	
		this.dialog.applyLayout = new QHBoxLayout(this.dialog);			
		
		this.dialog.restingCB = new QCheckBox("Also apply to resting parameters");
		this.dialog.applyLayout.addWidget(this.dialog.restingCB, 0, 0);		
		this.dialog.applyButton = new QPushButton("Apply");	
		this.dialog.applyLayout.addWidget(this.dialog.applyButton, 0, 1);

		this.dialog.mainLayout.addLayout(this.dialog.hintLayout);	
		this.dialog.mainLayout.addLayout(this.dialog.modeDirectLayout);		
		this.dialog.mainLayout.addLayout(this.dialog.axisOriginLayout);
		this.dialog.mainLayout.addLayout(this.dialog.applyLayout);		

		return this.dialog;
	};	
}