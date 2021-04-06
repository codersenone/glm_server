var express = require('express')
var bodyParser = require('body-parser')
var app = express()
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});
// 获取商品
app.get('/api/goods',(req,res)=>{
  let page = req.query.page
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("goods").find({}).limit(5).skip(5*(page-1)).toArray(function (err,data) {
      res.json(data)
      db.close
    })
  })
})

// 返回商品列表
app.get('/api/goods/category',(req,res)=>{
  let jData =null;
  let key = req.query.key;
  console.log('进入类别查询');
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("goods").find({}).toArray(function (err,data) {
      let jData = []
      for (let item of data){
        if (item.category==key)jData.push(item)
      }
      res.json(jData)
      db.close
    })
  })
})

// 返回关键词商品列表
app.get('/api/goods/search',(req,res)=>{
  let jData =null;
  let key = req.query.key;
  console.log('进入关键词查询');
  MongoClient.connect(url,{useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm")
    dbo.collection("goods").find({}).toArray(function (err,data) {
      let jData = []
      for (let item of data){
        if (item.title.indexOf(key)>=0)jData.push(item)
      }
      res.json(jData)
      db.close
    })
  })
})

// 返回热销商品商品列表
app.get('/api/goods/hot',(req,res)=>{
  let jData =null;
  MongoClient.connect(url,function (err,db) {
    if (err)throw err
    var dbo = db.db("glm")
    dbo.collection("hot").find({}).toArray(function (err,data) {
      res.json(data)
      db.close
    })
  })
})

// 返回商品图片
app.get('/api/images', function (req, res) {
  res.sendFile( __dirname + "/public/img/" + req.query.id+".webp" );
  console.log("图片请求 for " + req.query.id + " received.");
})

// 返回轮播图片
app.get('/api/swipeImages', function (req, res) {
  res.sendFile( __dirname + "/public/img/" +"banner"+ req.query.id+".jpg" );
})

// //返回商品的详细信息
app.get('/api/detail', function (req, res) {
  let id = req.query.id
  MongoClient.connect(url,{useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm")
    dbo.collection("goods").find().toArray(function (err,data) {
      for (let item of data){
        if (item.id==id){
          res.json(item)
          return
        }
      }
      db.close
    })
  })
})

// 登录验证,正确返回success为1，否则success为0
app.get('/api/login',(req,res)=>{
  let logUID = req.query.uid
  let logPSW = req.query.psw
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("users").find({uid:logUID}).toArray(function (err,data) {
      console.log(data.length);
      if (data.length!=0){
        if (data[0].password==logPSW){
          res.json({code:1})
        } else {
          res.json({code:-1})
        }
      }else {
        res.json({code:0})
      }
      db.close
    })
  })
})
// 创建新用户，创建成功返回success为1，否则success为0
app.get('/api/resign',(req,res)=>{
  let rUID = req.query.uid
  let rPSW = req.query.psw
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    let user = {
      uid:rUID,
      password:rPSW,
      orders:[],
      address:[]
    }
    dbo.collection("users").find({uid:rUID}).toArray(function (err,data) {
      if (data.length==0){
        dbo.collection("users").insert(user)
        res.json({success:1})
      } else{
        res.json({success:0})
      }
    })
    db.close
  })
})


// 修改个人信息
app.get('/api/personUpdate',(req,res)=>{
  let uid = req.query.uid
  let new_psw = req.query.psw
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("users").update({uid:uid},{$set:{password:new_psw}})
    res.json({success:1})
    db.close
  })
})
// 商品加入购物车
app.post('/api/addCar',(req,res)=>{
  let data = req.body
  var car = {
    uid:data.uid,
    content:[
      {
        gid:data.gid,
        num:data.num,
        select:true
      }
    ]
  }
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("cars").find({uid:data.uid}).toArray(function (err,data) {
      // 查找用户的购物车是否存在，不存在则创建
      if (data.length==0){
        dbo.collection("cars").insert(car)
      }else {
        // 存在购物车，就判断是否有对应的商品，无则插入，有则更新数据
        let index = -1
        let i = -1
        let oldNum = 0
        for (let item of data[0].content){
          i++
          if (item.gid== car.content[0].gid){
          //  找到了就修改数目
            index = i
            oldNum = item.num
          }
        }
        if (index!=-1){
          // 购物车中原本有的商品，找到并修改其数目
          data[0].content[index].num = oldNum+car.content[0].num
          dbo.collection("cars").update({uid:data[0].uid},{$set:{content:data[0].content}})
        }else {
          // 用户购物车中无该商品就插入新的记录
          dbo.collection("cars").update({uid:data[0].uid},{$push:{content:car.content[0]}})
        }
      }
    })
    res.json({success:1})
    db.close
  })
})

// 获取用户购物车信息
app.get('/api/getCar',(req,res)=>{
  let uid = req.query.uid
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("cars").find({uid:uid}).toArray((err,data)=>{
      var Data = []
      if (data.length!=0){
        Data = data[0].content
      }
      res.json(Data)
    })
    db.close
  })
})

// 更新用户购物车信息
app.post('/api/updateCar',(req,res)=>{
  let data = req.body
  let content = data.content
  let uid = data.uid
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("cars").update({uid:uid},{$set:{content:content}})
    res.json({flag:1})
    db.close
  })
})

// 用户地址的操作
app.post('/api/updateAddress',(req,res)=>{
  console.log("收到用户对地址的操作请求");
  let data = req.body
  let address = data.address
  let flag = data.flag
  let uid = data.uid
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    // 传入的flag为1是新添加一个地址
    if (flag==1){
      dbo.collection("users").find({uid:uid}).toArray(function (err,data) {
        let newAddr ={}
        new Promise(resolve=>{
          let aid
          if (data[0].address.length==0){
            aid = 1
          }else {
            aid = data[0].address[data[0].address.length - 1].aid + 1
          }
          newAddr = {
            aid:aid,
            name:address.name,
            phone:address.phone,
            addr:address.addr
          }
          resolve(newAddr)
        }).then(res=>{
          dbo.collection("users").update({uid:uid},{$push: {address:newAddr}})
        })
      })
	res.json({flag:1})
    } else {
      let obj = {
        aid:address.aid,
        name:address.name,
        phone:address.phone,
        addr:address.addr
      }
      dbo.collection("users").update(
          {uid:uid,"address.aid":address.aid},
          {$set:{'address.$':obj}}
      )
	res.json({flag:1})	
    }
    db.close
  })
})

// 删除一条地址记录
app.post('/api/delAddress',(req,res)=>{
  let uid = req.body.uid
  let aid = req.body.aid
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("users").update({uid:uid},{$pull:{address:{aid:aid}}})
    db.close
    res.json({flag:1})
  })
})

// 获取用户地址列表
app.get('/api/getAddress',(req,res)=>{
  let uid = req.query.uid
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("users").find({uid:uid}).toArray((err,data)=>{
      var Data = data[0].address
      res.json(Data)
    })
    db.close
  })
})

// 记录订单信息
app.post('/api/recordOrders',(req,res)=>{
  let uid = req.body.uid
  let addr = req.body.addr
  let goods = req.body.goods
  let totalPrice = req.body.totalPrice
  let orderId = req.body.orderId
  let time = new Date()
  let now = time.toLocaleString();
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    // 结算的商品从购物车去除
    for (let item of goods){
      dbo.collection("cars").update({uid:uid},{$pull:{content:{gid:item.gid+''}}})
      console.log(item.gid + "商品移除");
    }
    dbo.collection("orders").insert({
      orderId:orderId,
      uid:uid,
      addr:addr,
      goods:goods,
      totalPrice:totalPrice,
      status:1,
      submitTime:now
    })
    db.close
    res.json({code:1})
  })
})

// 返回用户的订单商品的库存
app.post('/api/getStock',(req,res)=>{
  let goods = req.body.goods
  let list = []
  MongoClient.connect(url,{useUnifiedTopology: true },function (err,db) {
    var dbo = db.db('glm')
    for (let i=0;i<goods.length;i++){
      new Promise(resolve=>{
        dbo.collection('goods').find({id:parseInt(goods[i].gid)}).toArray((err,data)=>{
          resolve(data[0].stock)
        })
      }).then(resl=>{
        list.push(resl)
        if (list.length==goods.length){
          res.json({list:list})
        }
      })
    }
    db.close
  })

})

// 库存变化
app.post('/api/stockChange',(req,res)=>{
  let goods = req.body.goods
  let flag = req.body.flag
  if (flag==-1){
    MongoClient.connect(url,{useUnifiedTopology: true },function (err,db) {
      var dbo = db.db('glm')
      for (let item of goods){
        console.log(item.gid+":减少数目"+item.num);
        dbo.collection('goods').update({id:parseInt(item.gid)},{$inc:{stock:-(item.num)}})
      }
      db.close
    })
  }else{
    MongoClient.connect(url,{useUnifiedTopology: true },function (err,db) {
      var dbo = db.db('glm')
      for (let item of goods){
        console.log(item.gid+":增加数目"+item.num);
        dbo.collection('goods').update({id:parseInt(item.gid)},{$inc:{stock:item.num}})
      }
      db.close
    })
  }
  res.json({flag:1})
})



// 获取用户订单信息
app.get('/api/getOrders',(req,res)=>{
  let uid = req.query.uid
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("orders").find({uid:uid}).sort({_id:-1}).toArray((err,data)=>{
      let orders = []
      if (data.length!=0){
        orders = data
      }
      res.json(orders)
    })
    db.close
  })
})


// 按订单号获取订单信息
app.get('/api/getOrderByOid',(req,res)=>{
  let oid = req.query.oid
  console.log("查询的订单为：" + oid);
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("orders").find({orderId:oid}).toArray((err,data)=>{
      let order = data[0]
      res.json(order)
    })
    db.close
  })
})

// 用户付款记录
app.get('/api/doPay',(req,res)=>{
  let oid = req.query.oid
  let time = new Date()
  let now = time.toLocaleString();
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("orders").update({orderId:oid},{$set:{status: 2,PayTime:now}})
    res.json({flag:1})
    db.close
  })
})

// 取消订单
app.get('/api/cancleOrder',(req,res)=>{
  let oid = req.query.oid
  let time = new Date()
  let now = time.toLocaleString();
  MongoClient.connect(url, {useUnifiedTopology: true },function (err,db) {
    if (err)throw err
    var dbo = db.db("glm");
    dbo.collection("orders").update({orderId:oid},{$set:{status: 0,CancleTime:now}})
    res.json({flag:1})
    db.close
  })
})

// 服务器端口3000
app.listen(3000,function () {
  console.log('glm服务器启动成功');
})