
#乳腺癌
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.preprocessing import MinMaxScaler #数据归一化 （0，1）
from sklearn.model_selection import train_test_split #划分数据集
import keras #高级神经网络接口
from keras.utils import to_categorical #将类别标签转换为one-hot编码 独热向量 1-->[0,0,0,1]
# from sklearn.metrics import classification_report #生成评估报告

#解决中文显示问题

plt.rcParams['font.sans-serif'] = ['SimHei']
plt.rcParams['axis.unicode_minus'] = False

datdaset=pd.read_csv('这里读入数据')
print(datdaset)

#提取数据特征X（切片操作）
X=datdaset.iloc[:,:-1].values #iloc 选中所有行和除最后一列以外的所有列 value转化为数组
print(X)
#提取标签Y
Y= datdaset.iloc[:, -1].values # 这里只提取最后一列
#或者通过列名提取 这一列叫target
#Y=dataset['target']
print(Y)

#分割数据集和训练集
#random_state确保每次划分数据集是随机的
X_train, X_test, Y_train, Y_test = train_test_split(X, Y, test_size=0.2,random_state=42)
print(X_train)
print(X_test)
print(Y_train)
print(Y_test)
#将数据标签转换为one-hot
Y_train_onehot = to_categorical(Y_train,2)
Y_test_onehot = to_categorical(Y_test,2)
print(Y_train_onehot)
print(Y_test_onehot)

#将数据特征进行归一化
# fit_transform based on train dataset which will learn data features and design learning method automatically
#transform only deal with data through methods which has been acquired before
sc=MinMaxScaler(feature_range=(0,1))
X_train=sc.fit_transform(X_train)
X_test=sc.transform(X_test)
print(X_train)
print(X_test)

#利用 keras 构建深度学习网络模型

model=keras.Sequential()  #层按线性堆叠
model.add(keras.layers.Dense(10,activation='relu' ))  #添加第一个Dense层，Dense(神经元数量，激活函数)
model.add(keras.layers.Dense(10, activation='relu' ))# 第二层
#接下来是输出层,这里是二分类，所以有两个神经元
model.add(keras.layers.Dense(2, activation='softmax'))  #也可以用sigmoid()，只用一个神经元

#接下来对网络做编译 在模型开始训练前必须先进行配置，如定义损失函数，参数更新等等
#需要先配置损失函数、优化器
#这里我们选择交叉熵损失函数，只有在标签是独热编码的时候才可以使用，优化器选择SGD(随机梯度下降法)
#我们这里是做分类，所以用精度来衡量
model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])# optimizer优化器，选择计算梯度的方式
#进行模型训练 这里测试机也是验证集 在训练集上训练模型 在测试集上评估模型
#返回一个History对象，记录训练过程
history=model.fit(X_train,Y_train_onehot,epochs=10,batch_size=16,validation_data=(X_test,Y_test_onehot))
#保存模型结构和参数
model.save('model.h5')

#绘制训练集和验证(测试)集的Loss值对比
#100轮训练过程的Loss值
plt.plot(history.history['loss'],label='train_loss') #训练集Loss
plt.plot(history.history['val_loss'],label='val_loss') #验证(测试)集Loss
plt.title('model loss')
plt.legend()
plt.show()

#绘制训练集和验证集的精确度（准确率）的对比图
plt.plot(history.history['accuracy'],label='train_accuracy') #训练集Loss
plt.plot(history.history['val_accuracy'],label='val_accuracy') #验证(测试)集Loss
plt.title('model accuracy')
plt.legend()
plt.show()

#如果测试集模型的精确度比训练集还要高，就说明模型模型没有过拟合
#但是如果epos=100时，随着训练次数增多，Loss值会变大，模型出现过拟合
#当然，由于数据集划分具有随机性，因此也不一定每次都有过拟合发生
#一般来说，当测试集准确率在95%，模型被认为应当是可用的
#参数比较少，数据集小时，只用CPU训练，不一定非要使用GPU训练










