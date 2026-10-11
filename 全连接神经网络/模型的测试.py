#乳腺癌
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.metrics import classification_report
from sklearn.preprocessing import MinMaxScaler #数据归一化 （0，1）
from sklearn.model_selection import train_test_split #划分数据集
import keras #高级神经网络接口
from keras.utils import to_categorical #将类别标签转换为one-hot编码 独热向量 1-->[0,0,0,1]
# from sklearn.metrics import classification_report #生成评估报告
from keras.models import load_model
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

#接下来导入模型
model=load_model('model.h5')

#利用训练好的模型进行测试 会返回每一项可能是良性、恶性的概率
#概率矩阵

predict=model.predict(X_test)
print(predict)
#根据良性和恶性概率大小返回0或1 0代表良性，1代表恶性
y_pred=np.argmax(predict,axis=1)
print(y_pred)

#将识别的结果转换成汉字
result=[]
for i in range(len(X_test)):
    if y_pred[i]==0:
        result.append('良性')
    else:
        result.append['恶性']

print(result)

#打印模型的精确度和召回率
#Y_test是测试集的标签，y_pred是模型预测的结果
report=classification_report(Y_test,y_pred,labels=[0,1],target_names=['良性','恶性'])
print(report)
